const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, mocks = {}, globals = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Buffer, URL, require: (name) => mocks[name] ?? require(name),
    process: { env: { NODE_ENV: 'production', NEXT_PUBLIC_PAYSTACK_LIVE_PUBLIC_KEY: 'pk_live_fixture' } },
    ...globals,
  }, { filename });
  return exports;
}

test('production rejects every local test-email bypass', () => {
  const mode = load('lib/paystackMode.ts');
  for (const email of mode.LOCAL_TEST_EMAILS) {
    assert.equal(mode.isLocalTestEmail(email), false);
    assert.equal(mode.isLocalTestEmail(` ${email.toUpperCase()} `), false);
  }
});

test('development retains normalized test-email support', () => {
  const mode = load('lib/paystackMode.ts', {}, { process: { env: { NODE_ENV: 'development' } } });
  assert.equal(mode.isLocalTestEmail(' TEST@EXAMPLE.COM '), true);
  assert.equal(mode.isLocalTestEmail('customer@example.com'), false);
});

test('live mode never falls back to a legacy test key', () => {
  const mode = load('lib/paystackMode.ts');
  assert.equal(mode.envValueForMode(undefined, undefined, 'pk_test_fixture', 'live'), '');
  assert.equal(mode.envValueForMode(undefined, 'pk_test_fixture', undefined, 'live'), '');
  assert.equal(mode.envValueForMode(undefined, undefined, 'pk_live_fixture', 'live'), 'pk_live_fixture');
});

function button(newTransaction, props = {}, errors = [], walletRequest = null) {
  const mode = load('lib/paystackMode.ts');
  const component = load('components/ui/PaystackButton.tsx', {
    react: { useRef: (current) => ({ current }), useEffect: () => {}, useId: () => 'test-wallet', useState: (value) => [walletRequest ? true : value, () => {}] },
    sonner: { toast: { error(message) { errors.push(message); }, info() {}, success() {} } },
    '@/lib/paystackMode': mode,
    '@/lib/paystackError': load('lib/paystackError.ts'),
  }, {
    // No checkout() method: a regression to the wallet preflight must fail.
    window: { PaystackPop: class { newTransaction = newTransaction; paymentRequest = walletRequest; } },
    document: { getElementById: () => ({ replaceChildren() {} }) },
    crypto: { randomUUID: () => '00000000-0000-0000-0000-000000000000' },
  });
  const rendered = component.default({ email: 'test@example.com', amount: 123.456, ...props });
  return rendered.props.children[walletRequest ? 0 : 1];
}

test('checkout uses live NGN amounts rounded to integer kobo', async () => {
  let captured;
  await button(async (options) => { captured = options; }).props.onClick();
  assert.equal(captured.key, 'pk_live_fixture');
  assert.equal(captured.currency, 'NGN');
  assert.equal(captured.amount, 12346);
  assert.ok(captured.channels.includes('apple_pay'));
});

test('error callback plus rejected checkout releases reservation only once', async () => {
  const closed = [];
  await button(async (options) => {
    options.onError(new Error('failed'));
    throw new Error('failed');
  }, { onClose: (reference) => closed.push(reference) }).props.onClick();
  assert.equal(closed.length, 1);
  assert.ok(closed[0].startsWith('storefront-'));
});

test('success is not followed by a stock release if popup also cancels', async () => {
  let successes = 0;
  let releases = 0;
  await button(async (options) => {
    options.onSuccess({ reference: options.reference });
    options.onCancel();
  }, { onSuccess: () => successes++, onClose: () => releases++ }).props.onClick();
  assert.equal(successes, 1);
  assert.equal(releases, 0);
});

test('plain SDK setup errors are shown and duplicate callbacks release only once', async () => {
  const errors = [];
  let releases = 0;
  await button((options) => {
    options.onError({ status: false, message: 'Transaction reference already exists' });
    options.onCancel();
  }, { onClose: () => releases++ }, errors).props.onClick();
  assert.deepEqual(errors, ['Transaction reference already exists']);
  assert.equal(releases, 1);
});

test('synchronous popup failure is visible and allows a fresh attempt', async () => {
  const errors = [];
  let attempts = 0;
  const view = button(() => {
    attempts++;
    throw { message: 'Unable to load payment window' };
  }, {}, errors);
  await view.props.onClick();
  await view.props.onClick();
  assert.equal(attempts, 2);
  assert.deepEqual(errors, ['Unable to load payment window', 'Unable to load payment window']);
});

test('error display hides keys and handles malformed SDK errors', () => {
  const { paystackErrorMessage } = load('lib/paystackError.ts');
  assert.equal(paystackErrorMessage({ message: 'Invalid pk_live_fixture' }), 'Invalid [redacted key]');
  for (const value of [null, undefined, {}, { message: 42 }, '']) {
    assert.ok(paystackErrorMessage(value).startsWith('Paystack could not start'));
  }
});

test('Apple Pay reserves stock before mounting official dark wallet button', async () => {
  const calls = [];
  await button(() => assert.fail('Standard popup must stay separate'), {
    beforePayment: async () => { calls.push('reserve'); return true; },
  }, [], async (options) => {
    calls.push('wallet');
    assert.equal(options.style.theme, 'dark');
    assert.equal(options.container, 'apple-pay-test-wallet');
    assert.equal(options.amount, 12346);
    assert.equal(options.currency, 'NGN');
    assert.ok(options.ref.startsWith('storefront-'));
    options.onElementsMount({ applePay: true });
  }).props.onClick();
  assert.deepEqual(calls, ['reserve', 'wallet']);
});

test('Apple Pay confirmation keeps every customer-facing line black', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components/ui/PaystackButton.tsx'), 'utf8');
  assert.match(source, /aria-label="Confirm Apple Pay checkout"[\s\S]*?!text-black/);
  assert.match(source, /Confirm Apple Pay checkout[\s\S]*?text-sm !text-black/);
  assert.match(source, /Use another payment method[\s\S]*?<\/button>/);
});

test('international destinations cannot reach payment before a shipping rate exists', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app/checkout/page.tsx'), 'utf8');
  assert.match(source, /internationalShippingPending = destinationCountry !== "NG"/);
  assert.match(source, /!internationalShippingPending &&/);
  assert.match(source, /shipping rate is not configured yet/);
});

test('failed stock validation never initializes Apple Pay', async () => {
  await button(() => assert.fail('Unexpected popup'), {
    beforePayment: async () => false,
  }, [], async () => assert.fail('Wallet initialized without stock')).props.onClick();
});

test('unavailable wallet releases once without invoking normal popup', async () => {
  let releases = 0;
  const errors = [];
  await button(() => assert.fail('Unexpected popup'), { onClose: () => releases++ }, errors, async (options) => {
    options.onElementsMount(null);
    options.onError({ message: 'Unavailable' });
  }).props.onClick();
  assert.equal(releases, 1);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('Apple Pay is unavailable'));
});

function tracking(globals = {}) {
  return load('lib/orderTracking.ts', {}, {
    process: { env: { ORDER_TRACKING_SECRET: 'test-only-not-a-real-secret' } }, ...globals,
  });
}
test('private links are order-bound and reject edits or missing credentials', () => {
  const api = tracking();
  const token = api.createOrderTrackingToken('order_one');
  assert.equal(api.isValidOrderTrackingToken('order_one', token), true);
  assert.equal(api.isValidOrderTrackingToken('order_two', token), false);
  assert.equal(api.isValidOrderTrackingToken('order_one', null), false);
  assert.equal(api.isValidOrderTrackingToken('order_one', token + 'x'), false);
  assert.equal(api.isValidOrderTrackingToken('order_one', token.replace(/.$/, token.endsWith('a') ? 'b' : 'a')), false);
  const link = new URL(api.orderTrackingUrl('order_one'));
  assert.equal(link.searchParams.has('token'), false);
  assert.ok(link.hash.startsWith('#token='));
});
test('tracking tokens expire and fail closed without a signing key', () => {
  const api = tracking();
  const token = api.createOrderTrackingToken('order_one');
  const later = tracking({ Date: { now: () => Date.now() + 181 * 86400000 } });
  assert.equal(later.isValidOrderTrackingToken('order_one', token), false);
  const noKey = tracking({ process: { env: {} } });
  assert.equal(noKey.isValidOrderTrackingToken('order_one', token), false);
  assert.throws(() => noKey.createOrderTrackingToken('order_one'));
});

test('order endpoint rejects missing credentials before any database read', async () => {
  let reads = 0;
  const route = load('app/api/orders/route.ts', {
    'node-appwrite': {
      Client: class { setEndpoint() { return this; } setProject() { return this; } setKey() { return this; } },
      Databases: class { async getDocument() { reads++; throw new Error('Unexpected read'); } },
    },
    '@/lib/resend': {}, '@/lib/onesignal': {}, '@/lib/adminPush': {},
    '@/lib/orderPayload': {}, '@/lib/cartValidation': {}, '@/lib/inventoryReservation': {},
    '@/lib/paystackMode': {}, '@/lib/adminAuth': { isAdminRequest: () => false },
    '@/lib/orderTracking': tracking(),
  });
  for (const query of ['orderId=known-order', 'orderId=global_settings&dbId=database&cId=storefront_settings']) {
    const result = await route.GET(new Request(`https://example.com/api/orders?${query}`));
    assert.equal(result.status, 403);
  }
  assert.equal(reads, 0);
});

