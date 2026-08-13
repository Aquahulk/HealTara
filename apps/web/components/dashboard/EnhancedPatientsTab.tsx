'use client';

import { useState, useMemo } from 'react';
import { Search, FileText, Calendar, Activity, Plus, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Patient {
  patientId: number;
  email: string;
  count: number;
  lastDate: string;
}

interface PatientNote {
  id: number;
  patientId: number;
  date: string;
  note: string;
  type: 'consultation' | 'prescription' | 'followup' | 'general';
}

interface EnhancedPatientsTabProps {
  patients: Patient[];
  loading: boolean;
}

export default function EnhancedPatientsTab({ patients, loading }: EnhancedPatientsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'consultation' | 'prescription' | 'followup' | 'general'>('general');
  const [patientNotes, setPatientNotes] = useState<Record<number, PatientNote[]>>({});
  const [sortBy, setSortBy] = useState<'name' | 'visits' | 'lastVisit'>('name');

  const filteredPatients = useMemo(() => {
    let filtered = patients.filter(p => 
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.patientId).includes(searchQuery)
    );

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.email?.split('@')[0] || String(a.patientId);
        const nameB = b.email?.split('@')[0] || String(b.patientId);
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'visits') {
        return b.count - a.count;
      } else {
        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      }
    });

    return filtered;
  }, [patients, searchQuery, sortBy]);

  const handleAddNote = () => {
    if (!selectedPatient || !newNote.trim()) return;

    const note: PatientNote = {
      id: Date.now(),
      patientId: selectedPatient.patientId,
      date: new Date().toISOString(),
      note: newNote.trim(),
      type: noteType,
    };

    setPatientNotes(prev => ({
      ...prev,
      [selectedPatient.patientId]: [...(prev[selectedPatient.patientId] || []), note],
    }));

    setNewNote('');
    setShowNoteModal(false);
  };

  const getPatientName = (p: Patient) => p.email?.split('@')[0] || `Patient ${p.patientId}`;

  if (loading) {
    return (
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-5">
          <h3 className="text-xl font-bold text-white flex items-center">
            <span className="mr-2">👥</span>
            Patient Management
          </h3>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading patients…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-black text-white mb-2">👥 Patient Management</h2>
        <p className="text-white/90 text-sm">Track patient history, notes, and records</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search patients by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="visits">Sort by Visits</option>
              <option value="lastVisit">Sort by Last Visit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-3xl font-black text-gray-900">{patients.length}</div>
          <div className="text-xs text-gray-500 font-medium">Total Patients</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-black text-gray-900">
            {patients.reduce((sum, p) => sum + p.count, 0)}
          </div>
          <div className="text-xs text-gray-500 font-medium">Total Visits</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🔄</span>
          </div>
          <div className="text-3xl font-black text-gray-900">
            {patients.filter(p => p.count > 1).length}
          </div>
          <div className="text-xs text-gray-500 font-medium">Returning Patients</div>
        </div>
      </div>

      {/* Patient List or Empty State */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-gray-500 text-lg font-medium">
            {searchQuery ? 'No patients found' : 'No patients yet'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {searchQuery ? 'Try a different search term' : 'Your patient list will appear here once you have appointments'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Cards */}
          <div className="space-y-3">
            {filteredPatients.map((patient) => {
              const name = getPatientName(patient);
              const lastVisit = new Date(patient.lastDate);
              const notes = patientNotes[patient.patientId] || [];

              return (
                <motion.div
                  key={patient.patientId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl p-4 border-2 transition-all cursor-pointer ${
                    selectedPatient?.patientId === patient.patientId
                      ? 'border-purple-500 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300 shadow-sm'
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-lg">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{name}</h4>
                        <p className="text-xs text-gray-500">{patient.email || `ID: ${patient.patientId}`}</p>
                      </div>
                    </div>
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="mt-4 flex gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {lastVisit.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-semibold text-purple-600">{patient.count} visits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600">{notes.length} notes</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Patient Detail Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-4 h-fit">
            {selectedPatient ? (
              <div>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-2xl">
                        {getPatientName(selectedPatient).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-gray-900">{getPatientName(selectedPatient)}</h3>
                        <p className="text-sm text-gray-500">{selectedPatient.email || `ID: ${selectedPatient.patientId}`}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs text-purple-600 font-medium mb-1">Total Visits</div>
                      <div className="text-2xl font-black text-purple-900">{selectedPatient.count}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 font-medium mb-1">Last Visit</div>
                      <div className="text-sm font-bold text-blue-900">
                        {new Date(selectedPatient.lastDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Patient Notes
                    </h4>
                    <button
                      onClick={() => setShowNoteModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Note
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(patientNotes[selectedPatient.patientId] || []).length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notes yet</p>
                      </div>
                    ) : (
                      (patientNotes[selectedPatient.patientId] || []).map((note) => (
                        <div key={note.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              note.type === 'consultation' ? 'bg-blue-100 text-blue-700' :
                              note.type === 'prescription' ? 'bg-green-100 text-green-700' :
                              note.type === 'followup' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {note.type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Select a patient to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      <AnimatePresence>
        {showNoteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNoteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black text-gray-900 mb-4">Add Patient Note</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Note Type</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="consultation">Consultation</option>
                    <option value="prescription">Prescription</option>
                    <option value="followup">Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter note details..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddNote}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Save Note
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteModal(false);
                      setNewNote('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
