import React from 'react';
import { Cpu, Cloud, Laptop, Clock, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { QpiAIExecutionAnalyticsItem } from '../../types';

interface QpiAIOptimizationChartProps {
  executions: QpiAIExecutionAnalyticsItem[];
  cloudCount: number;
  simulationCount: number;
  loading: boolean;
}

export const QpiAIOptimizationChart: React.FC<QpiAIOptimizationChartProps> = ({
  executions,
  cloudCount,
  simulationCount,
  loading,
}) => {
  const total = cloudCount + simulationCount;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] border border-[#D1FAE5] dark:border-[#065F46]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#14532D] dark:text-[#34D399]">
              QpiAI Optimization & Quantum Metrology Outcomes
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Recorded circular allocation solvers and quantum cathode simulation benchmarks.
            </p>
          </div>
        </div>

        {/* Live vs Simulation Badges */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399] border border-[#D1FAE5] dark:border-[#065F46]">
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud API: {cloudCount}</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] dark:bg-[#78350F]/30 text-[#D97706] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[#78350F]/40">
            <Laptop className="w-3.5 h-3.5" />
            <span>Local Simulation: {simulationCount}</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-dashed border-[#E5E7EB] dark:border-[#1E382B] space-y-2">
          <AlertCircle className="w-6 h-6 text-[#64748B]" />
          <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9]">
            No QpiAI Optimization Executions Recorded
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            No optimization runs have been executed yet. Launch the QpiAI Optimization Studio from the sidebar to record real allocation benchmarks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Transparency Disclaimer Notice */}
          <div className="p-3.5 rounded-2xl bg-[#FFFBEB] dark:bg-[#78350F]/20 border border-[#FDE68A] dark:border-[#78350F]/40 flex items-start space-x-2.5 text-xs text-[#92400E] dark:text-[#FDE68A]">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#D97706]" />
            <p className="leading-relaxed">
              <strong>Transparency Mandate:</strong> Live cloud executions represent API jobs submitted to the active QpiAI platform.
              Local simulations run exact heuristic QUBO algorithms on the host server and are strictly labeled as local solvers. Simulations are never presented as live cloud results.
            </p>
          </div>

          {/* Persisted Execution Comparison Cards */}
          <div className="space-y-2.5">
            {executions.map((exec) => {
              const allocations = exec.results?.recommended_allocations || [];
              const isCloud = exec.is_cloud_result || exec.backend === 'qpi_ai_cloud';

              return (
                <div
                  key={exec.id}
                  className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] space-y-2.5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#14532D] dark:text-[#34D399]">
                        {exec.engine_type}
                      </span>
                      {exec.battery_id && (
                        <span className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          ({exec.battery_id})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {/* Environment distinction badge */}
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isCloud
                            ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399] border-[#D1FAE5]'
                            : 'bg-[#FFFBEB] dark:bg-[#78350F]/30 text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A]'
                        }`}
                      >
                        {isCloud ? <Cloud className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                        <span>{isCloud ? 'Live QpiAI Cloud' : 'Local Simulation Solver'}</span>
                      </span>

                      {exec.execution_time_seconds !== null && exec.execution_time_seconds !== undefined && (
                        <span className="text-[10px] font-mono text-[#64748B] flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{Number(exec.execution_time_seconds).toFixed(3)}s</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Solver Backend and Allocations */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <div className="text-[#64748B] dark:text-[#94A3B8]">
                      Solver Backend: <span className="font-mono font-bold text-[#1F2937] dark:text-[#F1F5F9]">{exec.backend}</span>
                    </div>

                    <div className="text-[#94A3B8] font-mono text-[10px]">
                      Recorded: {new Date(exec.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Allocation Details */}
                  {allocations.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-2">
                      {allocations.map((alloc: any, i: number) => (
                        <div
                          key={i}
                          className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#121F17] border border-[#D1FAE5] dark:border-[#065F46] text-[11px] flex items-center space-x-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                          <span className="font-bold text-[#14532D] dark:text-[#34D399]">
                            {alloc.recommended_pathway.toUpperCase().replace('_', ' ')}
                          </span>
                          {alloc.score && (
                            <span className="text-[10px] font-mono text-[#64748B]">
                              ({alloc.score} pts)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};