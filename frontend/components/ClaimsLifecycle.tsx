import React, { useEffect, useState } from 'react'
import { publishWorkflowEvent } from '../lib/workflow-memory'
import { useChatApi, type WorkspaceModuleResponse } from '../lib/api-client'
import ModuleConnectionBanner from './ModuleConnectionBanner'

type LifecycleTab = 'overview' | 'workbench' | 'track'

const lifecycleStages = [
  { label: 'FNOL received', owner: 'Intake', status: 'Complete', detail: 'Loss facts captured and evidence package opened.' },
  { label: 'Coverage review', owner: 'Adjuster', status: 'In progress', detail: 'Policy terms, deductibles, limits, and exclusions under review.' },
  { label: 'Evidence request', owner: 'Customer care', status: 'Waiting', detail: 'Missing photos and contractor estimate requested from insured.' },
  { label: 'Estimate review', owner: 'Claims desk', status: 'Next', detail: 'Damage estimate and scope validation before settlement recommendation.' },
  { label: 'Resolution', owner: 'Supervisor', status: 'Pending', detail: 'Settlement, denial, withdrawal, or escalation decision.' },
]

const claims = [
  {
    id: 'CLM-2026-10482',
    insured: 'Elena Garcia',
    loss: 'Wind / roof damage',
    status: 'Coverage review',
    priority: 'Critical',
    amount: '$18,400',
    owner: 'Unassigned',
    next: 'Assign field adjuster and request roof photos',
    updated: '27 min ago',
  },
  {
    id: 'CLM-2026-10463',
    insured: 'Marcus Lee',
    loss: 'Water intrusion',
    status: 'Evidence request',
    priority: 'High',
    amount: '$9,800',
    owner: 'T. Wilson',
    next: 'Follow up on mitigation invoice',
    updated: '58 min ago',
  },
  {
    id: 'CLM-2026-10422',
    insured: 'Anika Shah',
    loss: 'Auto collision',
    status: 'Estimate review',
    priority: 'Normal',
    amount: '$6,250',
    owner: 'R. Patel',
    next: 'Review supplement request',
    updated: '2h ago',
  },
]

const playbooks = [
  { title: 'Customer update', copy: 'Draft a plain-language status update with what is done, what is missing, and when we will follow up.' },
  { title: 'Adjuster note', copy: 'Summarize coverage posture, damages, documents received, and recommended next action.' },
  { title: 'Escalation check', copy: 'Flag SLA risk, high severity indicators, dispute risk, or missing authority approval.' },
]

const statusTone = (status: string) => {
  if (status === 'Complete') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'In progress') return 'bg-cyan-50 text-cyan-700 ring-cyan-200'
  if (status === 'Waiting') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

const priorityTone = (priority: string) => {
  if (priority === 'Critical') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (priority === 'High') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

export const ClaimsLifecycle: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LifecycleTab>('overview')
  const [selectedClaim, setSelectedClaim] = useState(claims[0])
  const { getWorkspaceModule } = useChatApi()
  const [moduleContract, setModuleContract] = useState<WorkspaceModuleResponse | null>(null)
  const [moduleError, setModuleError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getWorkspaceModule('claims-lifecycle')
      .then(contract => {
        if (!cancelled) {
          setModuleContract(contract)
          setModuleError(null)
        }
      })
      .catch(error => {
        if (!cancelled) setModuleError(error instanceof Error ? error.message : 'Claims lifecycle module contract unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [getWorkspaceModule])

  useEffect(() => {
    publishWorkflowEvent({
      type: 'claims.lifecycle.viewed',
      title: `Claims Lifecycle: ${activeTab}`,
      summary: `User is reviewing claim lifecycle ${activeTab} for ${selectedClaim.id}.`,
      source: 'claims-lifecycle',
      workflow: 'Claims Lifecycle',
      status: 'info',
      entityId: selectedClaim.id,
      payload: { activeTab, selectedClaim },
    })
  }, [activeTab, selectedClaim])

  return (
    <div className="h-full overflow-hidden bg-[#f5f8fb] p-4 text-slate-900">
      <div className="flex h-full flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/70 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <ModuleConnectionBanner contract={moduleContract} error={moduleError} compact />
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#0B8FA3]">Claims operations</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Claim Lifecycle</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Track each claim from intake through coverage review, evidence requests, estimate validation, settlement, and customer communication.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-lg font-bold text-slate-950">31</div>
              <div className="text-slate-500">Open claims</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
              <div className="text-lg font-bold text-amber-800">8</div>
              <div className="text-amber-700">SLA risk</div>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 shadow-sm">
              <div className="text-lg font-bold text-cyan-800">14m</div>
              <div className="text-cyan-700">Median touch</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            ['overview', 'Overview'],
            ['workbench', 'Claim workbench'],
            ['track', 'Timeline and communications'],
          ] as [LifecycleTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === tab ? 'bg-[#0B8FA3] text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)_330px]">
          <section className="flex min-h-0 flex-col rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-bold text-slate-950">Claim queue</h2>
              <p className="text-xs text-slate-500">Assigned, unassigned, and SLA-sensitive work</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {claims.map((claim) => (
                  <button
                    key={claim.id}
                    onClick={() => setSelectedClaim(claim)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${selectedClaim.id === claim.id ? 'border-[#0B8FA3] bg-[#EAF7F8]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-950">{claim.id}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{claim.insured} · {claim.loss}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${priorityTone(claim.priority)}`}>{claim.priority}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{claim.status}</span>
                      <span className="text-slate-400">{claim.updated}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-bold text-slate-950">
                {activeTab === 'overview' ? 'Lifecycle overview' : activeTab === 'workbench' ? 'Claim workbench' : 'Timeline and communications'}
              </h2>
              <p className="text-xs text-slate-500">{selectedClaim.id} · {selectedClaim.insured}</p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff,#f3f8fb)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Current claim</div>
                        <h3 className="mt-1 text-xl font-bold text-slate-950">{selectedClaim.loss}</h3>
                        <p className="mt-1 text-sm text-slate-600">{selectedClaim.insured} · Owner: {selectedClaim.owner}</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${priorityTone(selectedClaim.priority)}`}>{selectedClaim.priority}</span>
                        <div className="mt-2 text-lg font-bold text-slate-950">{selectedClaim.amount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {lifecycleStages.map((stage, index) => (
                      <div key={stage.label} className="flex gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F8] text-sm font-bold text-[#0B8FA3]">{index + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-950">{stage.label}</h4>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${statusTone(stage.status)}`}>{stage.status}</span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{stage.detail}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">Owner: {stage.owner}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'workbench' && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-bold text-slate-950">Next best actions</h3>
                    <div className="mt-3 space-y-2">
                      {(moduleContract?.actions?.map(action => action.label) || [
                        selectedClaim.next,
                        'Check coverage conditions against loss description',
                        'Confirm customer-preferred communication channel',
                        'Prepare adjuster note before reassignment',
                      ]).map((action, index) => (
                        <label key={action} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                          <input type="checkbox" className="mt-1 rounded border-slate-300 text-[#0B8FA3]" defaultChecked={index === 0} />
                          <span>{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-bold text-slate-950">Claim snapshot</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      {[
                        ['Claim', selectedClaim.id],
                        ['Insured', selectedClaim.insured],
                        ['Loss', selectedClaim.loss],
                        ['Current status', selectedClaim.status],
                        ['Reserve / estimate', selectedClaim.amount],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-2">
                          <span className="font-semibold text-slate-500">{label}</span>
                          <span className="text-right font-bold text-slate-900">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-cyan-100 bg-cyan-50 p-4 xl:col-span-2">
                    <h3 className="text-sm font-bold text-cyan-950">Operator handoff</h3>
                    <p className="mt-2 text-sm leading-6 text-cyan-900">
                      Use the AI companion to turn this claim context into an adjuster summary, customer update, or supervisor escalation. The workflow context is shared across the workspace.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'track' && (
                <div className="space-y-4">
                  {[
                    ['Now', selectedClaim.status, selectedClaim.next],
                    ['Earlier today', 'Evidence reviewed', 'Initial evidence package checked and missing information list created.'],
                    ['Yesterday', 'FNOL created', 'Loss notice captured and claim file opened for review.'],
                  ].map(([time, title, detail]) => (
                    <div key={`${time}-${title}`} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{time}</div>
                      <h3 className="mt-1 text-sm font-bold text-slate-950">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
                    </div>
                  ))}

                  <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff,#f3f8fb)] p-4">
                    <h3 className="text-sm font-bold text-slate-950">Customer update draft</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      We are reviewing your claim and currently need the remaining supporting documents before the next coverage decision. Once received, your adjuster will review the estimate and share the next update.
                    </p>
                    <button className="mt-3 rounded-full bg-[#0B8FA3] px-4 py-2 text-xs font-bold text-white hover:bg-[#08798A]">Copy update</button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-bold text-slate-950">Playbooks</h2>
              <p className="text-xs text-slate-500">Reusable claim actions and prompts</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className="space-y-3">
                {playbooks.map((playbook) => (
                  <div key={playbook.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold text-slate-950">{playbook.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{playbook.copy}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[22px] border border-amber-100 bg-amber-50 p-4">
                <h3 className="text-sm font-bold text-amber-950">Needs attention</h3>
                <div className="mt-3 space-y-2 text-sm text-amber-900">
                  <div>• Unassigned critical claim</div>
                  <div>• Missing roof photos</div>
                  <div>• Coverage review due today</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
