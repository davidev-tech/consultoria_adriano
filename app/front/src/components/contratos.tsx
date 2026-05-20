import React, { useState } from 'react';
import { Search, Bell, Plus, FileText, ChevronDown, Link as LinkIcon, X } from 'lucide-react';

export default function ContractModels() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('Todas as empresas');

  // Dados mockados baseados no vídeo
  const contracts = [
    { id: 1, company: 'Lar São Francisco', model: 'Na labia', start: '2026-05-15', end: '2026-05-15', status: 'Encerrado', value: 'R$ 4' },
    { id: 2, company: 'FarmaVida', model: 'Gestão de Dispensação', start: '2026-05-05', end: '2026-05-14', status: 'Ativo', value: 'R$ 4' },
  ];

  // Filtra os contratos com base na seleção
  const filteredContracts = selectedCompany === 'Todas as empresas' 
    ? contracts 
    : contracts.filter(c => c.company === selectedCompany);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#09090b]">
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 w-96">
          <Search className="w-4 h-4 text-zinc-500 mr-2" />
          <input 
            type="text" 
            placeholder="Buscar clientes, relatórios, atividades..." 
            className="bg-transparent border-none text-sm outline-none text-zinc-300 w-full placeholder:text-zinc-500"
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="text-zinc-400 hover:text-zinc-100">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center text-sm font-medium border border-emerald-800">
            MC
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase mb-1 block">// Catálogo</span>
            <h1 className="text-3xl font-semibold text-zinc-100 mb-1">Modelos de Contrato</h1>
            <p className="text-zinc-400 text-sm">Templates reutilizáveis para vínculo com empresas.</p>
          </div>
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-100 px-4 py-2 rounded-md text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Novo modelo
          </button>
        </div>

        {/* Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {/* Card 1 */}
          <div className="bg-[#121214] border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors cursor-pointer flex gap-4">
            <div className="bg-emerald-500/10 p-2 rounded-md h-fit">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-zinc-100 mb-1">Gestão de Dispensação</h3>
              <p className="text-xs text-zinc-500 mb-2">Mensal</p>
              <p className="text-sm text-zinc-400">Controle SNGPC e Farmácia Popular</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#121214] border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors cursor-pointer flex gap-4">
            <div className="bg-emerald-500/10 p-2 rounded-md h-fit">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-zinc-100 mb-1">Na labia</h3>
              <p className="text-xs text-zinc-500 mb-2">visita</p>
              <p className="text-sm text-zinc-400">pagamentos e acordos feitos presencialmente</p>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-1">Contratos Vinculados</h2>
              <p className="text-zinc-400 text-sm">Vínculos ativos entre empresas clientes e modelos contratuais.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <select 
                  className="appearance-none bg-[#121214] border border-zinc-800 text-zinc-300 text-sm rounded-md pl-4 pr-10 py-2 outline-none focus:border-zinc-600 min-w-[200px]"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                >
                  <option value="Todas as empresas">Todas as empresas</option>
                  <option value="Clínica REABILITA">Clínica REABILITA</option>
                  <option value="Lar São Francisco">Lar São Francisco</option>
                  <option value="FarmaVida">FarmaVida</option>
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                Vincular
              </button>
            </div>
          </div>

          <div className="bg-[#121214] border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Empresa</th>
                  <th className="px-6 py-4 font-medium">Modelo</th>
                  <th className="px-6 py-4 font-medium">Início</th>
                  <th className="px-6 py-4 font-medium">Fim</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                {filteredContracts.length > 0 ? (
                  filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-100">{contract.company}</td>
                      <td className="px-6 py-4">{contract.model}</td>
                      <td className="px-6 py-4 text-zinc-400">{contract.start}</td>
                      <td className="px-6 py-4 text-zinc-400">{contract.end}</td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${contract.status === 'Ativo' ? 'text-emerald-500' : 'text-zinc-500'}`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{contract.value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      Nenhum contrato cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Vincular Contrato */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#121214] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-zinc-800/50">
              <h3 className="text-lg font-medium text-zinc-100">Vincular contrato a uma empresa</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Empresa cliente *</label>
                <div className="relative">
                  <select className="w-full appearance-none bg-[#09090b] border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-2.5 outline-none focus:border-emerald-600 transition-colors">
                    <option value="">Selecione a empresa...</option>
                    <option value="reabilita">Clínica REABILITA</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Modelo de contrato *</label>
                <div className="relative">
                  <select className="w-full appearance-none bg-[#09090b] border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-2.5 outline-none focus:border-emerald-600 transition-colors">
                    <option value="">Selecione o modelo...</option>
                    <option value="dispensacao">Gestão de Dispensação</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Valor acordado (BRL) *</label>
                  <input type="text" className="w-full bg-[#09090b] border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-2.5 outline-none focus:border-emerald-600 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Status</label>
                  <div className="relative">
                    <select className="w-full appearance-none bg-[#09090b] border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-2.5 outline-none focus:border-emerald-600 transition-colors">
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Início *</label>
                  <input type="date" defaultValue="2026-05-17" className="w-full bg-[#09090b] border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-2.5 outline-none focus:border-emerald-600 transition-colors [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fim (opcional)</label>
                  <input type="date" className="w-full bg-[#09090b] border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-2.5 outline-none focus:border-emerald-600 transition-colors [color-scheme:dark]" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800/50 bg-[#09090b]/50 rounded-b-xl">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors">
                Vincular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}