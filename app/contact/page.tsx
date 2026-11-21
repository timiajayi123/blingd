"use client";

import { useState } from "react";
import { ArrowUpRight, MailX, MessageCircle } from "lucide-react";

const whatsappNumber = "0903 070 6919";
const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [orderId, setOrderId] = useState("");
  const [issue, setIssue] = useState("");

  const whatsappMessage = [
    "Hello BLING’D support,",
    "",
    `Name: ${name.trim()}`,
    `Order ID: ${orderId.trim()}`,
    `Issue: ${issue.trim()}`,
  ].join("\n");

  return (
    <main className="min-h-screen bg-black px-5 pb-20 pt-28 text-white sm:px-8 sm:pt-36">
      <section className="mx-auto w-full max-w-4xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">
          Customer support
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-black uppercase leading-tight sm:text-6xl">
          Contact BLING’D
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
          For order questions, delivery updates, or product support, message us directly on WhatsApp.
        </p>

        <form action={whatsappUrl} method="get" target="_blank" className="mt-10 border-2 border-white bg-white p-5 text-black sm:p-7">
          <input type="hidden" name="text" value={whatsappMessage} />
          <div className="flex items-center gap-4 border-b border-black/15 pb-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-black/25">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-black/45">Fastest response</p>
              <p className="mt-1 text-lg font-black tabular-nums">{whatsappNumber}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-[9px] font-black uppercase tracking-[0.18em] text-black/50">
              Your name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
                placeholder="Full name"
                className="h-12 w-full border border-black/20 bg-white px-4 text-sm font-medium normal-case tracking-normal text-black outline-none transition-colors placeholder:text-black/30 focus:border-black"
              />
            </label>
            <label className="space-y-2 text-[9px] font-black uppercase tracking-[0.18em] text-black/50">
              Order ID
              <input
                type="text"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                required
                placeholder="ORD-... or order_..."
                className="h-12 w-full border border-black/20 bg-white px-4 text-sm font-medium normal-case tracking-normal text-black outline-none transition-colors placeholder:text-black/30 focus:border-black"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2 text-[9px] font-black uppercase tracking-[0.18em] text-black/50">
            What is the issue?
            <textarea
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              required
              rows={4}
              placeholder="Briefly explain what you need help with"
              className="w-full resize-y border border-black/20 bg-white px-4 py-3 text-sm font-medium normal-case leading-6 tracking-normal text-black outline-none transition-colors placeholder:text-black/30 focus:border-black"
            />
          </label>

          <button type="submit" className="group mt-5 flex h-12 w-full items-center justify-center gap-3 bg-black px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-zinc-800">
            Continue to WhatsApp
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </form>

        <div className="mt-6 flex items-start gap-4 border border-white/15 bg-zinc-950 p-5 sm:p-6">
          <MailX className="mt-0.5 h-5 w-5 shrink-0 text-white/55" />
          <div>
            <h2 className="text-sm font-black uppercase">Email replies are not monitored</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              BLING’D emails are used for order notifications and updates only. Please use WhatsApp above whenever you need a response from our team.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
