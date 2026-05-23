import React from 'react'; 
 import { AlertTriangle, X } from 'lucide-react'; 
 
 interface UnsavedChangesModalProps { 
   isOpen: boolean; 
   onClose: () => void; 
   onConfirm: () => void; 
 } 
 
 export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({ 
   isOpen, 
   onClose, 
   onConfirm, 
 }) => { 
   if (!isOpen) return null; 
 
   return ( 
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"> 
       <div data-wizard-light className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp relative"> 
         <button 
           onClick={onClose} 
           className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" 
         > 
           <X className="w-5 h-5" /> 
         </button> 
 
         <div className="flex items-start gap-4 mb-6"> 
           <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shrink-0 mt-0.5"> 
             <AlertTriangle className="w-6 h-6" /> 
           </div> 
           <div> 
             <h3 className="text-lg font-bold text-slate-900 tracking-tight">Unsaved Changes Detected</h3> 
             <p className="text-xs text-slate-500 mt-1 leading-relaxed"> 
               You have uncommitted modifications in your company setup wizard. If you leave now, your draft will remain stored in local memory, but will not be initialized as an active SQLite ledger. 
             </p> 
           </div> 
         </div> 
 
         <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100"> 
           <button 
             type="button" 
             onClick={onClose} 
             className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer" 
           > 
             Stay on Page 
           </button> 
           <button 
             type="button" 
             onClick={onConfirm} 
             className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer" 
           > 
             Leave to Company List 
           </button> 
         </div> 
       </div> 
     </div> 
   ); 
 }; 
