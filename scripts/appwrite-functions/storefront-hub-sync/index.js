const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const sdk = process.env.TIMZI_HUB_PACKAGE_JSON ? createRequire(process.env.TIMZI_HUB_PACKAGE_JSON)('node-appwrite') : require('node-appwrite');
const { Client, TablesDB, Query } = sdk;

const SOURCE_DB = process.env.SOURCE_DATABASE_ID;
const HUB_DB = process.env.HUB_DATABASE_ID || 'timzi_hub';
const PROJECT_ID = process.env.HUB_PROJECT_ROW_ID;
const STATE_TABLE = process.env.HUB_SYNC_STATE_TABLE || 'storefront_sync_state';
const SOURCE_TABLES = ['storefront_products','storefront_categories','storefront_orders','storefront_delivery','storefront_drops','storefront_settings','storefront_banners','storefront_billing_services','storefront_inventory_reservations'];
const key = (kind, id) => `hub_${createHash('sha256').update(`${PROJECT_ID}:${kind}:${id}`).digest('hex').slice(0, 29)}`;
const slug = (name, id) => `${String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120)||'item'}-${id.slice(-8)}`;
const money = (value) => { const number = Number(value); if(!Number.isFinite(number)) throw new Error('Invalid money value'); return Math.round(number * 100); };
const plain = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith('$') && k !== 'lockPassword'));

function services(sourceKey = process.env.SOURCE_APPWRITE_KEY) {
  if (!SOURCE_DB || !PROJECT_ID || !process.env.SOURCE_PROJECT_ID || !process.env.HUB_APPWRITE_PROJECT_ID || !sourceKey || !process.env.HUB_APPWRITE_KEY) throw new Error('Sync credentials are missing.');
  const source = new TablesDB(new Client().setEndpoint(process.env.SOURCE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').setProject(process.env.SOURCE_PROJECT_ID).setKey(sourceKey));
  const hub = new TablesDB(new Client().setEndpoint(process.env.HUB_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').setProject(process.env.HUB_APPWRITE_PROJECT_ID).setKey(process.env.HUB_APPWRITE_KEY));
  return { source, hub };
}
async function optional(hub, tableId, rowId, transactionId) {
  try { return await hub.getRow({databaseId:HUB_DB,tableId,rowId,...(transactionId?{transactionId}:{})}); }
  catch(e) { if(e.code===404) return null; throw e; }
}
async function stage(hub, tx, tableId, sourceId, data) {
  const rowId=key(tableId,sourceId);
  const existing=await optional(hub,tableId,rowId,tx);
  if(existing && (existing.project_id!==PROJECT_ID || (data.source_record_id && existing.source_record_id!==data.source_record_id))) throw new Error(`Destination ID collision in ${tableId}`);
  await hub.upsertRow({databaseId:HUB_DB,tableId,rowId,transactionId:tx,data:{project_id:PROJECT_ID,...data}});
  return rowId;
}

async function project(source, hub, tx, table, d) {
  const clean=plain(d), id=d.$id;
  if(table==='storefront_categories') {
    await stage(hub,tx,'commerce_categories',id,{name:d.name,slug:slug(d.name,id),description:d.description||null,status:d.isActive===false?'inactive':'active',position:Number(d.order)||0,source_record_id:id});
  } else if(table==='storefront_products') {
    const status=d.comingSoon?'draft':'active';
    const productId=await stage(hub,tx,'commerce_products',id,{name:d.name,slug:slug(d.name,id),description:d.long_description||d.short_description||null,status,currency:'NGN',options_json:JSON.stringify(clean),source_record_id:id});
    await stage(hub,tx,'commerce_variants',id,{product_id:productId,title:'Default',sku:`storefront-${id}`,status,currency:'NGN',price_minor:money(d.Price),available_quantity:Number(d.stock)||0,option_values_json:JSON.stringify({sizes:d.sizes||[],colors:d.colors||null}),source_record_id:`${id}:default`});
    const media = Array.isArray(d.images) ? d.images : [];
    for(const [i,url] of media.entries()) if(typeof url==='string' && url) await stage(hub,tx,'commerce_media',`${id}:${i}`,{product_id:productId,url,provider:'external',position:i,source_record_id:`${id}:${i}`});
    const oldMedia=await hub.listRows({databaseId:HUB_DB,tableId:'commerce_media',queries:[Query.equal('product_id',productId),Query.limit(100)]});
    for(const old of oldMedia.rows) { const m=String(old.source_record_id||'').match(new RegExp(`^${id}:(\\d+)$`)); if(m && Number(m[1])>=media.length) await hub.deleteRow({databaseId:HUB_DB,tableId:'commerce_media',rowId:old.$id,transactionId:tx}); }
    const categories=await source.listRows({databaseId:SOURCE_DB,tableId:'storefront_categories',queries:[Query.equal('name',String(d.category||'')),Query.limit(1)]});
    const categoryId=categories.rows[0] ? key('commerce_categories',categories.rows[0].$id) : null;
    const links=await hub.listRows({databaseId:HUB_DB,tableId:'commerce_product_categories',queries:[Query.equal('product_id',productId),Query.limit(100)]});
    for(const link of links.rows) if(link.$id===key('commerce_product_categories',`${id}:${link.category_id}`) && link.category_id!==categoryId) await hub.deleteRow({databaseId:HUB_DB,tableId:'commerce_product_categories',rowId:link.$id,transactionId:tx});
    if(categoryId) await stage(hub,tx,'commerce_product_categories',`${id}:${categoryId}`,{product_id:productId,category_id:categoryId});
  } else if(table==='storefront_delivery') {
    await stage(hub,tx,'commerce_delivery_options',id,{name:d.name,region:d.state,description:JSON.stringify({type:d.type,sortOrder:d.sortOrder}),price_minor:money(d.price),currency:'NGN',is_active:d.active!==false,source_record_id:id});
  } else if(table==='storefront_drops') {
    await stage(hub,tx,'commerce_drops',id,{name:d.name,slug:d.slug,description:d.description||null,status:d.enabled===false?'draft':'active',starts_at:d.launchAt||null,source_record_id:id});
  } else if(table==='storefront_settings') {
    await stage(hub,tx,'commerce_site_settings',id,{is_locked:!!d.isLocked,settings_json:JSON.stringify(clean),source_record_id:id});
  } else if(table==='storefront_orders') {
    let p; try { p=JSON.parse(d.items); } catch { throw new Error('Invalid order payload'); }
    if(Array.isArray(p)) { const meta=p.find(item=>item?.__type==='order_meta')||{}; p={lineItems:p.filter(item=>item?.__type!=='order_meta'),paymentBreakdown:meta.paymentBreakdown,status:meta.status||meta.orderStatus}; }
    if(!p || !Array.isArray(p.lineItems)) throw new Error('Unsupported order payload');
    const identity=String(d.email||'').trim().toLowerCase(), customerId=identity?key('commerce_customers',identity):null;
    if(customerId && !await optional(hub,'commerce_customers',customerId,tx)) await stage(hub,tx,'commerce_customers',identity,{full_name:d.userName||null,email:d.email||null,phone:d.phone||null,currency:'NGN',source_record_id:identity});
    const b=p.paymentBreakdown||{}, status=p.status||p.orderStatus||b.status||'unknown';
    const orderId=await stage(hub,tx,'commerce_orders',id,{order_number:d.orderNumber,customer_id:customerId,customer_name:d.userName||null,customer_email:d.email||null,customer_phone:d.phone||null,status,currency:'NGN',total_minor:money(d.total),subtotal_minor:b.subtotal==null?null:money(b.subtotal),delivery_minor:b.deliveryPrice==null?null:money(b.deliveryPrice),discount_minor:b.discount==null?null:money(b.discount),delivery_address_json:JSON.stringify({address:d.address}),notes:JSON.stringify({paymentBreakdown:b,salesSource:d.salesSource,paymentProofFileId:d.paymentProofFileId,sourceLineItems:p.lineItems}),placed_at:d.$createdAt,source_record_id:id});
    for(const [i,item] of p.lineItems.entries()) {const q=Number(item.quantity);if(!Number.isInteger(q)||q<1)throw new Error('Invalid order quantity');await stage(hub,tx,'commerce_order_items',`${id}:${i}`,{order_id:orderId,product_id:item.$id?key('commerce_products',item.$id):null,title:String(item.name||'Item').slice(0,255),quantity:q,unit_price_minor:money(item.price),line_total_minor:money(Number(item.price)*q),image_url:item.imageUrl||null,source_record_id:`${id}:${i}`});}
    const oldItems=await hub.listRows({databaseId:HUB_DB,tableId:'commerce_order_items',queries:[Query.equal('order_id',orderId),Query.limit(100)]});
    for(const old of oldItems.rows) {const m=String(old.source_record_id||'').match(new RegExp(`^${id}:(\\d+)$`));if(m && Number(m[1])>=p.lineItems.length)await hub.deleteRow({databaseId:HUB_DB,tableId:'commerce_order_items',rowId:old.$id,transactionId:tx});}
  }
}

async function syncDocument(source,hub,table,id) {
  if(!SOURCE_TABLES.includes(table)) return 'ignored';
  const stateId=key('sync_state',`${table}:${id}`);
  for(let attempt=0;attempt<4;attempt++) {
    let d; try { d=await source.getRow({databaseId:SOURCE_DB,tableId:table,rowId:id}); } catch(e) { if(e.code===404) return 'retained'; throw e; }
    const tx=await hub.createTransaction();
    try {
      const old=await optional(hub,STATE_TABLE,stateId,tx.$id);
      if(old && new Date(old.source_updated_at).getTime()>=new Date(d.$updatedAt).getTime()) {await hub.updateTransaction({transactionId:tx.$id,rollback:true});return 'unchanged';}
      await hub.upsertRow({databaseId:HUB_DB,tableId:STATE_TABLE,rowId:stateId,transactionId:tx.$id,data:{project_id:PROJECT_ID,collection_id:table,source_id:id,source_updated_at:d.$updatedAt,payload_json:JSON.stringify(plain(d))}});
      await project(source,hub,tx.$id,table,d);
      await hub.updateTransaction({transactionId:tx.$id,commit:true});
      const latest=await source.getRow({databaseId:SOURCE_DB,tableId:table,rowId:id}).catch(e=>{if(e.code===404)return null;throw e;});
      if(latest && new Date(latest.$updatedAt).getTime()>new Date(d.$updatedAt).getTime() && attempt<3) continue;
      if(latest && new Date(latest.$updatedAt).getTime()>new Date(d.$updatedAt).getTime()) throw new Error('Source kept changing during sync');
      return 'updated';
    } catch(e) {await hub.updateTransaction({transactionId:tx.$id,rollback:true}).catch(()=>{});if(e.code===409 && attempt<3)continue;throw e;}
  }
  throw new Error('Concurrent update could not be resolved');
}

async function scheduled(source,hub,log) {
  const state=await optional(hub,STATE_TABLE,key('checkpoint',PROJECT_ID));
  const fallback=process.env.SYNC_START_AT || '1970-01-01T00:00:00.000Z';
  const since=new Date(new Date(state?.source_updated_at||fallback).getTime()-120000).toISOString();
  const started=new Date().toISOString(); let processed=0;
  for(const table of SOURCE_TABLES) {
    let cursor;
    do {const page=await source.listRows({databaseId:SOURCE_DB,tableId:table,queries:[Query.greaterThanEqual('$updatedAt',since),Query.orderAsc('$id'),Query.limit(100),...(cursor?[Query.cursorAfter(cursor)]:[])]});for(const row of page.rows){await syncDocument(source,hub,table,row.$id);processed++;}cursor=page.rows.length===100?page.rows.at(-1).$id:null;}while(cursor);
  }
  await hub.upsertRow({databaseId:HUB_DB,tableId:STATE_TABLE,rowId:key('checkpoint',PROJECT_ID),data:{project_id:PROJECT_ID,collection_id:key('checkpoint',PROJECT_ID),source_id:key('checkpoint',PROJECT_ID),source_updated_at:started,payload_json:'{}'}});
  log(`Operational reconciliation processed ${processed} records.`);return processed;
}

module.exports = async ({req,res,log,error}) => {
  try {
    const {source,hub}=services(req.headers['x-appwrite-key'] || process.env.SOURCE_APPWRITE_KEY);
    const event=req.headers['x-appwrite-event']||'';
    if(!event) {const count=await scheduled(source,hub,log);return res.json({ok:true,processed:count});}
    const body=req.bodyJson || {};
    const table=body.$tableId||body.$collectionId;
    if(!SOURCE_TABLES.includes(table) || !body.$id) return res.json({ok:true,ignored:true});
    if(event.endsWith('.delete')) {log('Source deletion retained in hub for review.');return res.json({ok:true,retained:true});}
    const result=await syncDocument(source,hub,table,body.$id);
    return res.json({ok:true,result});
  } catch(e) {error(`Hub sync failed: ${e.message}`);return res.json({ok:false,error:'Operational sync failed'},500);}
};
module.exports._internal={syncDocument,scheduled,services};
