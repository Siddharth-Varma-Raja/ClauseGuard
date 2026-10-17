"use client"

import Stepper, {LEASE_STEPS } from "@/components/app/stepper";
import { useState } from "react";

export default function Review() {
    const [tab, setTab] = useState()
    return (
        <main className="mx-auto max-w-[1400px] px-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-dark">Lease Review</h1>
                </div>
                <Stepper steps={LEASE_STEPS} current={tab === "Ask ClauseGuard" ? 3 : 2}/>
            </div>

            
        </main>
    )
}