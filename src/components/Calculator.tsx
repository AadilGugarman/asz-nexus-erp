import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Delete, Divide, Minus, Plus, Equal, Hash, History, Trash2, RotateCcw } from 'lucide-react';
import { useUIStore } from '@/store';
import { createPortal } from 'react-dom';

export const Calculator: React.FC = () => {
  const { isCalculatorOpen, closeCalculator } = useUIStore();
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<{ expr: string; res: string; timestamp: number }[]>(() => {
    const saved = localStorage.getItem('asz_calc_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('asz_calc_history', JSON.stringify(history));
  }, [history]);

  const calculate = useCallback(() => {
    if (!expression) return;
    try {
      const sanitized = expression.replace(/[^-+*/.0-9]/g, '');
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      
      if (isNaN(result) || !isFinite(result)) {
        setDisplay('Error');
        return;
      }

      const resStr = String(Number(result.toFixed(8)));
      setHistory(prev => [{ expr: expression, res: resStr, timestamp: Date.now() }, ...prev].slice(0, 20));
      setDisplay(resStr);
      setExpression(resStr);
    } catch (e) {
      setDisplay('Error');
    }
  }, [expression]);

  const handleInput = useCallback((val: string) => {
    if (val === 'C') {
      setDisplay('0');
      setExpression('');
      return;
    }
    if (val === '=') {
      calculate();
      return;
    }
    if (val === 'backspace') {
      setExpression(prev => {
        if (prev.length <= 1) return '';
        return prev.slice(0, -1);
      });
      return;
    }

    setExpression(prev => {
      if (val === '.') {
        const lastNumber = prev.split(/[-+*/]/).pop() || '';
        if (lastNumber.includes('.')) return prev;
      }
      
      if (prev === '0' && !isNaN(Number(val))) return val;
      
      const lastChar = prev.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar) && ['+', '-', '*', '/'].includes(val)) {
        return prev.slice(0, -1) + val;
      }

      return prev + val;
    });
  }, [calculate]);

  const clearHistory = () => setHistory([]);
  
  const reuseHistory = (item: { expr: string; res: string }) => {
    setExpression(item.res);
    setDisplay(item.res);
  };

  useEffect(() => {
    if (!isCalculatorOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleInput(e.key);
      if (['+', '-', '*', '/'].includes(e.key)) handleInput(e.key);
      if (e.key === '.' || e.key === ',') handleInput('.');
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleInput('=');
      }
      if (e.key === 'Escape') closeCalculator();
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleInput('backspace');
      }
      if (e.key === 'c' || e.key === 'C') handleInput('C');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalculatorOpen, handleInput, closeCalculator]);

  useEffect(() => {
    if (expression) {
      setDisplay(expression);
    } else {
      setDisplay('0');
    }
  }, [expression]);

  if (!isCalculatorOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-900 w-full max-w-[680px] rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in flex flex-col md:flex-row h-[580px] md:h-auto"
      >
        {/* Left Side: History (Visible on md+ or dedicated section) */}
        <div className="flex-1 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col min-w-0">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">History</span>
            </div>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                title="Clear history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 opacity-40">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <RotateCcw className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">No calculations yet</p>
              </div>
            ) : (
              history.map((h, i) => (
                <button 
                  key={h.timestamp}
                  onClick={() => reuseHistory(h)}
                  className="w-full text-left group p-4 rounded-3xl bg-white dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mb-1.5 truncate group-hover:text-indigo-400 transition-colors">{h.expr}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums truncate tracking-tight">
                      = {h.res}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:rotate-90" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Calculator Core */}
        <div className="w-full md:w-[340px] flex flex-col bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Hash className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">Calculator</span>
            </div>
            <button 
              onClick={closeCalculator}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Display Area */}
          <div className="px-6 py-4 mb-2">
            <div className="relative group overflow-hidden rounded-[2.5rem] p-[1px] bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 shadow-lg">
              <div className="bg-white dark:bg-slate-950 rounded-[2.45rem] p-8 pr-10 shadow-inner min-h-[110px] flex flex-col justify-end relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-10 -mt-10" />
                
                <div className="text-right relative z-10">
                  {/* Current Operation Hint (Subtle) */}
                  <div className="absolute -top-6 right-0 flex items-center gap-1.5 opacity-40">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                      {['+', '-', '*', '/'].includes(expression.slice(-1)) ? 'Waiting...' : 'Active'}
                    </span>
                    <div className={`w-1 h-1 rounded-full ${['+', '-', '*', '/'].includes(expression.slice(-1)) ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  </div>

                  <div className={`w-full font-black text-slate-900 dark:text-white tabular-nums leading-none transition-all duration-300 tracking-tighter ${
                    display.length > 15 ? 'text-2xl' : display.length > 12 ? 'text-3xl' : display.length > 9 ? 'text-4xl' : 'text-6xl'
                  }`}>
                    {display}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Keypad */}
          <div className="p-6 pt-2 grid grid-cols-4 gap-3">
            <CalcButton label="C" onClick={() => handleInput('C')} variant="danger" />
            <CalcButton label="/" onClick={() => handleInput('/')} variant="operator" icon={<Divide className="w-5 h-5" />} />
            <CalcButton label="*" onClick={() => handleInput('*')} variant="operator" icon={<X className="w-5 h-5" />} />
            <CalcButton label="⌫" onClick={() => handleInput('backspace')} variant="operator" icon={<Delete className="w-5 h-5" />} />
            
            <CalcButton label="7" onClick={() => handleInput('7')} />
            <CalcButton label="8" onClick={() => handleInput('8')} />
            <CalcButton label="9" onClick={() => handleInput('9')} />
            <CalcButton label="-" onClick={() => handleInput('-')} variant="operator" icon={<Minus className="w-5 h-5" />} />
            
            <CalcButton label="4" onClick={() => handleInput('4')} />
            <CalcButton label="5" onClick={() => handleInput('5')} />
            <CalcButton label="6" onClick={() => handleInput('6')} />
            <CalcButton label="+" onClick={() => handleInput('+')} variant="operator" icon={<Plus className="w-5 h-5" />} />
            
            <CalcButton label="1" onClick={() => handleInput('1')} />
            <CalcButton label="2" onClick={() => handleInput('2')} />
            <CalcButton label="3" onClick={() => handleInput('3')} />
            <CalcButton label="=" onClick={() => handleInput('=')} variant="primary" rowSpan={2} icon={<Equal className="w-7 h-7" />} />
            
            <CalcButton label="0" onClick={() => handleInput('0')} colSpan={2} />
            <CalcButton label="." onClick={() => handleInput('.')} />
          </div>

          {/* Tips */}
          <div className="px-6 pb-6 text-center">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Tip: Use Numpad for faster entry
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface CalcButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'operator' | 'primary' | 'danger';
  icon?: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
}

const CalcButton: React.FC<CalcButtonProps> = ({ label, onClick, variant = 'default', icon, colSpan = 1, rowSpan = 1 }) => {
  const base = "flex items-center justify-center rounded-[1.25rem] font-black text-base transition-all active:scale-95 cursor-pointer h-14 select-none shadow-sm";
  const variants = {
    default: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:shadow-md hover:shadow-indigo-500/5",
    operator: "bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-transparent",
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 border border-transparent active:shadow-inner",
    danger: "bg-rose-50/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-transparent",
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]}`}
      style={{ 
        gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined,
        gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
        height: rowSpan > 1 ? '100%' : undefined
      }}
    >
      {icon || label}
    </button>
  );
};
