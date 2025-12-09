import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, 
  User, 
  Check, 
  AlertTriangle, 
  Info, 
  Menu, 
  X, 
  Clock, 
  Shield,
  Euro,
  Users,
  LogOut,
  Lock,
  ChevronRight,
  Trash2,
  Key,
  Save,
  XCircle
} from 'lucide-react';

// --- FIREBASE SETUP CON SEGURIDAD ---
let app, auth, db;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  
  if (firebaseConfig) {
    // Evitar reinicializar si ya existe
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("Firebase config not found. App running in offline/demo mode.");
  }
} catch (e) {
  console.error("Error initializing Firebase:", e);
}

// --- CONSTANTS ---
const MASTER_ADMIN_ID = '123';
const MASTER_ADMIN_PASS = 'test';

// 1. Archivo local (Nombre del archivo SVG subido)
const LOCAL_LOGO = "logo.svg";
// 2. URL Pública fiable (Fallback)
const ONLINE_LOGO = "https://www.lapreferente.com/imagenes/escudos/1286.png";

// --- UTILS & HELPERS ---

const getBlockStart = (date) => {
  const d = new Date(date);
  const day = d.getDay(); 
  let diff = 0;
  if (day === 4) diff = 0;
  if (day === 5) diff = -1;
  if (day === 6) diff = -2;
  if (day === 0) diff = -3;
  if (day === 1) diff = -4;
  if (day === 2) diff = -5; 
  if (day === 3) diff = -6; 

  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const formatDateId = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (date) => {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const isDateInBlock = (checkDate, blockStartDateStr) => {
  if (!blockStartDateStr) return false;
  const blockStart = new Date(blockStartDateStr);
  const check = new Date(checkDate);
  check.setHours(0,0,0,0);
  const diffTime = check - blockStart;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays >= 0 && diffDays <= 4;
};

// --- COMPONENT: ROBUST LOGO LOADER ---
const UDRLogo = ({ className }) => {
  const [src, setSrc] = useState(LOCAL_LOGO);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (src === LOCAL_LOGO) {
      setSrc(ONLINE_LOGO);
    } else {
      setHasError(true);
    }
  };

  // Si falla la carga del archivo, mostramos un escudo vectorial generado en código
  if (hasError) {
    return (
      <div className={`${className} flex items-center justify-center`} title="U.D. Roteña">
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg">
          {/* Forma del Escudo */}
          <path d="M10,10 Q50,20 90,10 V40 Q90,90 50,110 Q10,90 10,40 Z" fill="white" stroke="#1a1a1a" strokeWidth="2" />
          
          {/* División superior izquierda (Rayas Verdiblancas) */}
          <path d="M12,12 Q30,15 48,12 V50 H12 Z" fill="#007a33" /> 
          <rect x="18" y="12" width="6" height="38" fill="white" />
          <rect x="30" y="12" width="6" height="38" fill="white" />
          <rect x="42" y="12" width="6" height="38" fill="white" />

          {/* División superior derecha (Castillo y Mar) */}
          <path d="M52,12 Q70,15 88,12 V50 H52 Z" fill="#87CEEB" />
          {/* Castillo Simplificado */}
          <path d="M60,35 L60,25 L65,25 L65,20 L75,20 L75,25 L80,25 L80,35 Z" fill="#FFD700" stroke="black" strokeWidth="0.5"/>
          <rect x="68" y="30" width="4" height="6" fill="black" rx="2" />
          
          {/* Banda Diagonal (Nombre) */}
          <path d="M10,40 L90,65 L90,85 L10,60 Z" fill="#FFD700" stroke="black" strokeWidth="1" />
          <text x="50" y="70" textAnchor="middle" fontSize="14" fontWeight="bold" fill="black" transform="rotate(12, 50, 70)" style={{fontFamily: 'Arial'}}>P.U.D.R.</text>

          {/* Parte Inferior (Rojo y Negro) */}
          <path d="M12,65 L48,75 V105 Q20,90 12,65 Z" fill="#ce1126" /> {/* Rojo */}
          <path d="M52,76 L88,88 V55 Q88,90 52,105 Z" fill="black" /> {/* Negro - Ajuste visual */}
          <path d="M50,75 V108 Q50,108 50,108" stroke="black" strokeWidth="0.5"/> {/* Línea central */}
          {/* Relleno negro correcto */}
          <path d="M50,75 L90,85 V45 Q90,90 50,108 Z" fill="black" />
          <path d="M10,60 L50,73 V108 Q10,90 10,60 Z" fill="#D22B2B" />
        </svg>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      className={className} 
      alt="Escudo UDR"
      style={{ objectFit: 'contain' }}
      onError={handleError}
    />
  );
};

// --- SUB-COMPONENTS ---

const Modal = ({ 
  isOpen, 
  onClose, 
  selectedBlock, 
  formData, 
  setFormData, 
  onReservation, 
  isAdminLoggedIn,
  onConfirmPayment, 
  onCancelReservation 
}) => {
  if (!isOpen || !selectedBlock) return null;
  
  const res = selectedBlock.reservation;
  
  let daysLeft = 0;
  if (res && res.createdAt) {
    const diff = (new Date() - res.createdAt.toDate()) / (1000 * 60 * 60 * 24);
    daysLeft = Math.max(0, 5 - Math.ceil(diff));
  }

  const blockEndDate = new Date(selectedBlock.date);
  blockEndDate.setDate(blockEndDate.getDate() + 4); 

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-md overflow-hidden max-h-[90vh] flex flex-col rounded-t-3xl animate-slide-up sm:animate-none border-t-4 border-red-600">
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-black p-5 flex justify-between items-center text-white shrink-0 shadow-lg">
          <h3 className="font-black text-xl tracking-tight uppercase italic">
            {res ? 'Detalle Reserva' : 'Nueva Reserva'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="text-center mb-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-red-600 text-xs uppercase font-extrabold tracking-widest">Fin de Semana</p>
            <p className="text-2xl font-black text-gray-900 mt-1">
              {formatDisplayDate(selectedBlock.date)} - {formatDisplayDate(blockEndDate)}
            </p>
          </div>

          {!res && (
            <form onSubmit={onReservation} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Nombre</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-base focus:border-red-600 focus:bg-white outline-none transition-all font-semibold"
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  placeholder="Nombre del titular"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Apellidos</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-base focus:border-red-600 focus:bg-white outline-none transition-all font-semibold"
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Apellidos"
                />
              </div>
              
              <div className="flex items-center space-x-3 bg-red-50 p-4 rounded-xl border-2 border-red-100 active:bg-red-100 transition-colors cursor-pointer" onClick={() => setFormData({...formData, isMember: !formData.isMember})}>
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${formData.isMember ? 'bg-red-600 border-red-600' : 'border-gray-400 bg-white'}`}>
                    {formData.isMember && <Check size={16} className="text-white"/>}
                </div>
                <label className="text-gray-900 font-bold flex-1 cursor-pointer">¿Es Socio?</label>
              </div>

              {formData.isMember && (
                 <div className="animate-fade-in">
                   <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Número de Socio (Opcional)</label>
                   <input 
                     type="number" 
                     className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-base focus:border-red-600 focus:bg-white outline-none transition-all font-semibold"
                     value={formData.memberNumber}
                     onChange={e => setFormData({...formData, memberNumber: e.target.value})}
                     placeholder="Ej: 1234"
                   />
                 </div>
              )}

              <div className="bg-gradient-to-r from-yellow-50 to-white border-l-8 border-yellow-400 p-4 text-sm text-yellow-900 rounded-r-xl shadow-sm">
                <p className="font-black flex items-center gap-2 text-2xl"><Euro size={24} strokeWidth={3}/> {formData.isMember ? '100,00' : '300,00'}</p>
                <p className="mt-1 font-medium opacity-80 leading-tight">Si no se realiza el pago en 5 días, la fecha quedará libre automáticamente.</p>
              </div>

              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-red-600 to-red-900 hover:from-red-500 hover:to-red-800 active:scale-[0.98] text-white font-black py-4 rounded-xl shadow-xl transition-all text-lg mt-2 uppercase tracking-wide"
              >
                Confirmar Reserva
              </button>
            </form>
          )}

          {res && (
            <div className="space-y-4">
               <div className={`p-5 rounded-xl border-l-8 shadow-sm ${res.status === 'confirmed' ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'}`}>
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-full ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {res.status === 'confirmed' ? <Check size={24} strokeWidth={3}/> : <Clock size={24} strokeWidth={3}/>}
                      </div>
                      <span className="font-black uppercase text-lg text-gray-800">{res.status === 'confirmed' ? 'Pagado' : 'Pendiente'}</span>
                  </div>
                  {res.status === 'pending' && (
                      <p className="text-sm text-orange-900 font-medium pl-12">
                         Caduca en: <span className="font-bold text-2xl">{daysLeft}</span> días
                      </p>
                  )}
               </div>

               <div className="bg-gray-50 p-5 rounded-xl space-y-3 border border-gray-200">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Titular</span>
                    <span className="font-bold text-right text-gray-900">{res.firstName} {res.lastName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Tipo</span>
                    <span className="font-bold text-right text-gray-900">{res.isMember ? `Socio ${res.memberNumber ? `(#${res.memberNumber})` : ''}` : 'No Socio'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-500 font-medium">Importe</span>
                    <span className="font-black text-red-700 text-2xl text-right">{res.price.toFixed(2)}€</span>
                  </div>
               </div>

               {isAdminLoggedIn && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center mb-2">Zona Admin</p>
                      
                      {res.status === 'pending' && (
                          <button 
                              onClick={onConfirmPayment}
                              className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white py-3 rounded-xl flex justify-center items-center gap-2 font-bold shadow-lg active:scale-95 transition-all"
                          >
                              <Check size={20} strokeWidth={3}/> Confirmar Pago
                          </button>
                      )}

                      <button 
                          onClick={onCancelReservation}
                          className="w-full bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 py-3 rounded-xl flex justify-center items-center gap-2 font-bold active:scale-95 transition-all"
                      >
                        <Trash2 size={20}/> Cancelar Reserva
                      </button>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({ 
  admins, 
  onExit, 
  onAddAdmin, 
  onDeleteAdmin,
  onUpdateAdminPass,
  newAdminData, 
  setNewAdminData,
  currentAdminId
}) => {
  const isMaster = currentAdminId === MASTER_ADMIN_ID;
  const [editingId, setEditingId] = useState(null);
  const [editPassValue, setEditPassValue] = useState("");

  const startEditing = (admin) => {
    setEditingId(admin.id);
    setEditPassValue(admin.password);
  };

  const saveEditing = (adminId) => {
    onUpdateAdminPass(adminId, editPassValue);
    setEditingId(null);
    setEditPassValue("");
  };

  return (
    <div className="p-4 space-y-6 pb-20 max-w-2xl mx-auto">
       <div className="flex justify-between items-center bg-black/90 backdrop-blur text-white p-5 rounded-2xl shadow-lg border border-red-900 sticky top-20 z-10">
         <h2 className="text-xl font-black italic uppercase">Panel Admin</h2>
         <button onClick={onExit} className="text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-md"><LogOut size={16}/> Salir</button>
       </div>
       
       <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <div className="flex items-center gap-4 mb-6 text-white bg-gradient-to-r from-red-900 to-black p-4 rounded-2xl shadow-md">
             <div className="bg-white/20 p-3 rounded-full"><User size={24}/></div>
             <div>
                <span className="text-xs text-red-200 font-bold uppercase tracking-wider block">Sesión Actual</span>
                <span className="font-bold text-lg">{currentAdminId === MASTER_ADMIN_ID ? 'Admin Principal (123)' : `Colaborador (${currentAdminId})`}</span>
             </div>
          </div>

          {isMaster ? (
             <>
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide border-b-2 border-red-100 pb-2">Gestión de Equipo</h3>
                <div className="space-y-3 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <p className="text-xs text-gray-500 font-bold uppercase">Añadir nuevo colaborador</p>
                  <div className="flex flex-col gap-3">
                    <input 
                        type="number" 
                        placeholder="Nº Socio (Login)" 
                        className="border-2 border-gray-200 bg-white p-3 rounded-xl text-base outline-none focus:border-red-600 transition-colors font-semibold"
                        value={newAdminData.id}
                        onChange={(e) => setNewAdminData({...newAdminData, id: e.target.value})}
                    />
                    <input 
                        type="text" 
                        placeholder="Contraseña" 
                        className="border-2 border-gray-200 bg-white p-3 rounded-xl text-base outline-none focus:border-red-600 transition-colors font-semibold"
                        value={newAdminData.pass}
                        onChange={(e) => setNewAdminData({...newAdminData, pass: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={onAddAdmin} 
                    className="w-full bg-black text-white py-4 rounded-xl hover:bg-gray-900 font-bold text-sm flex justify-center items-center gap-2 active:scale-[0.98] transition-all shadow-lg"
                  >
                    <User size={18}/> CREAR ADMINISTRADOR
                  </button>
                </div>

                <div className="mt-8">
                  <p className="text-sm font-bold text-gray-700 mb-4 ml-2">Listado de Administradores</p>
                  <ul className="space-y-3">
                      <li className="bg-gradient-to-r from-red-50 to-white border border-red-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
                        <span className="font-bold text-red-900 text-sm flex items-center gap-2"><Lock size={16}/> Master (123)</span>
                        <span className="text-[10px] uppercase font-black bg-red-600 text-white px-3 py-1 rounded-full shadow-sm">Principal</span>
                      </li>
                      {admins.map(a => (
                          <li key={a.id} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                <span className="font-mono font-bold text-sm flex items-center gap-2 text-gray-700">
                                  <User size={16} className="text-gray-400"/> Socio {a.memberId}
                                </span>
                                <div className="flex gap-2">
                                    {editingId === a.id ? (
                                      <>
                                        <button 
                                            onClick={() => saveEditing(a.id)}
                                            className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-sm transition-colors"
                                        >
                                            <Save size={18}/>
                                        </button>
                                        <button 
                                            onClick={() => setEditingId(null)}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <XCircle size={18}/>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                            onClick={() => startEditing(a)}
                                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                        >
                                            <Key size={18}/>
                                        </button>
                                        <button 
                                            onClick={() => onDeleteAdmin(a.id)}
                                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                      </>
                                    )}
                                </div>
                            </div>
                            
                            {editingId === a.id ? (
                              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                <span className="text-xs text-gray-500 font-bold whitespace-nowrap">Nueva pass:</span>
                                <input 
                                  type="text" 
                                  value={editPassValue} 
                                  onChange={(e) => setEditPassValue(e.target.value)}
                                  className="border rounded px-2 py-1 text-sm w-full outline-none focus:border-blue-500"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 font-mono pl-7">Pass: ••••••••</div>
                            )}
                          </li>
                      ))}
                  </ul>
                </div>
             </>
          ) : (
             <div className="p-8 bg-gray-50 rounded-2xl text-center text-gray-500 text-sm flex flex-col items-center gap-4 border border-gray-200">
                <Shield size={48} className="text-gray-300"/>
                <p>Tu nivel de acceso no permite gestionar usuarios.</p>
             </div>
          )}
       </div>
    </div>
  );
};

const NormsView = ({ onBack }) => (
  <div className="p-5 pb-20 space-y-6 text-gray-700 text-sm leading-relaxed overflow-y-auto h-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 sticky top-0 bg-transparent z-10 backdrop-blur-sm">
        <h2 className="text-2xl font-black text-white italic uppercase tracking-wider drop-shadow-md">Normativa</h2>
        <button onClick={onBack} className="bg-white/10 hover:bg-white/20 border border-white/20 p-2 rounded-full shadow-sm text-white transition-all"><X size={24}/></button>
      </div>
      
      <section className="bg-white p-6 rounded-2xl shadow-xl border-l-8 border-red-600">
          <h3 className="font-bold text-xl text-gray-900 flex items-center gap-3 mb-3"><User size={24} className="text-red-600"/> 1. Uso exclusivo</h3>
          <p className="text-gray-600 font-medium">El socio podrá solicitar la caseta para actos personales, de hijos o nietos. El responsable siempre será el SOCIO.</p>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-xl border-l-8 border-yellow-400">
          <h3 className="font-bold text-xl text-gray-900 flex items-center gap-3 mb-3"><Euro size={24} className="text-yellow-500"/> 2. Pagos y Reservas</h3>
          <p className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-yellow-800 text-xs mb-4 font-semibold">
              <AlertTriangle size={16} className="inline mr-2 mb-0.5"/> La reserva no es efectiva hasta el ingreso. <strong>Plazo máximo de 5 días</strong>.
          </p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100">
                <span className="block text-xs text-gray-500 font-bold uppercase">Socio</span>
                <span className="font-black text-2xl text-gray-800">100€</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100">
                <span className="block text-xs text-gray-500 font-bold uppercase">No Socio</span>
                <span className="font-black text-2xl text-gray-800">300€</span>
            </div>
          </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-xl border-l-8 border-black">
          <h3 className="font-bold text-xl text-gray-900 flex items-center gap-3 mb-3"><XCircle size={24} className="text-black"/> 3. Cancelaciones</h3>
          <ul className="space-y-3 text-sm font-medium">
              <li className="flex gap-3 items-start"><span className="text-red-500 mt-1">●</span> Aviso con 10 días tras alquiler: Devolución posible.</li>
              <li className="flex gap-3 items-start"><span className="text-red-500 mt-1">●</span> Largo plazo ({'>'}3 meses): Aviso con 1 mes de antelación.</li>
              <li className="flex gap-3 items-start"><span className="text-red-500 mt-1">●</span> Fuerza mayor: Sin penalización.</li>
          </ul>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-xl border-l-8 border-red-600">
          <h3 className="font-bold text-xl text-gray-900 flex items-center gap-3 mb-3"><Key size={24} className="text-red-600"/> 4. Llaves y Fianza</h3>
          <p className="mb-3 text-lg font-bold text-gray-800">Fianza: <span className="text-red-600">50€</span> <span className="text-sm font-normal text-gray-500">al recoger la llave.</span></p>
          <div className="text-sm bg-gray-50 p-4 rounded-xl space-y-2 font-medium border border-gray-200">
            <p className="flex justify-between"><span>Recogida:</span> <span className="font-bold">JUEVES (sin excepción)</span></p>
            <p className="flex justify-between"><span>Devolución:</span> <span className="font-bold">Lunes o Martes</span></p>
            <p className="flex justify-between pt-2 border-t border-gray-200 text-red-600"><span>Día adicional:</span> <span className="font-bold">30€</span></p>
          </div>
      </section>

      <button onClick={onBack} className="w-full mt-4 py-5 bg-gradient-to-r from-red-600 to-black text-white rounded-2xl font-black text-lg shadow-2xl hover:scale-[1.02] transition-transform uppercase italic tracking-wider">
          Volver al Calendario
      </button>
  </div>
);

const LandingView = ({ onSelect }) => (
  <div className="flex flex-col items-center justify-center min-h-[90vh] px-6 animate-fade-in pb-10">
    <div className="mb-12 text-center flex flex-col items-center relative z-10">
      <div className="w-40 h-40 bg-gradient-to-b from-white to-gray-200 rounded-b-[3rem] rounded-t-2xl flex items-center justify-center shadow-2xl overflow-hidden mb-8 p-1 ring-8 ring-red-600/30 backdrop-blur-sm">
          <UDRLogo className="w-full h-full object-contain drop-shadow-lg" />
      </div>
      <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300 uppercase tracking-tighter drop-shadow-sm italic">
        Peña Unión
      </h1>
      <h2 className="text-sm text-yellow-400 font-bold tracking-[0.5em] mt-2 border-y border-yellow-500/50 py-2 px-6 shadow-sm">
        DEPORTIVA ROTEÑA
      </h2>
    </div>

    <div className="w-full max-w-sm space-y-5 relative z-10">
      <button 
        onClick={() => onSelect('calendar')}
        className="w-full bg-white hover:bg-red-50 active:scale-[0.98] transition-all p-1 rounded-2xl shadow-2xl group"
      >
        <div className="bg-white border-2 border-white p-5 rounded-xl flex items-center justify-between group-hover:border-red-500 transition-colors">
            <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform">
                <User size={28} strokeWidth={2.5} />
            </div>
            <div className="text-left">
                <h3 className="font-black text-xl text-gray-900 uppercase italic">Soy Socio</h3>
                <p className="text-xs text-red-600 font-bold mt-0.5 tracking-wide">RESERVAR Y VER CALENDARIO</p>
            </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:text-red-500 transition-colors" strokeWidth={3}/>
        </div>
      </button>

      <button 
        onClick={() => onSelect('adminLogin')}
        className="w-full bg-gradient-to-r from-gray-900 to-black text-white p-1 rounded-2xl shadow-2xl active:scale-[0.98] transition-all"
      >
        <div className="bg-transparent border border-gray-700 p-5 rounded-xl flex items-center justify-between hover:border-gray-500 transition-colors">
            <div className="flex items-center gap-5">
            <div className="p-4 bg-gray-800 rounded-2xl text-gray-300 shadow-inner border border-gray-700">
                <Lock size={28} />
            </div>
            <div className="text-left">
                <h3 className="font-black text-xl text-white uppercase italic">Administrador</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5 tracking-wide">ACCESO JUNTA DIRECTIVA</p>
            </div>
            </div>
            <ChevronRight className="text-gray-600 group-hover:text-white" />
        </div>
      </button>
    </div>
    
    <div className="mt-20 text-center opacity-30 text-white relative z-10">
      <p className="text-[10px] font-black tracking-[0.2em] uppercase">Aplicación Oficial</p>
      <p className="text-[10px]">© 2025 P.U.D. Roteña</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export default function App() {
  const [user, setUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // UI State
  const [selectedBlock, setSelectedBlock] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState('landing'); 
  const [slideDirection, setSlideDirection] = useState(''); // 'left' or 'right'
  
  // Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState(''); // Stores WHO is logged in
  const [adminUser, setAdminUser] = useState({ id: '', pass: '' });
  const [newAdminData, setNewAdminData] = useState({ id: '', pass: '' });

  // Swipe handlers
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const changeMonth = (direction) => {
      setSlideDirection(direction === 'next' ? 'left' : 'right');
      const newDate = new Date(currentDate);
      if (direction === 'next') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else {
        newDate.setMonth(newDate.getMonth() - 1);
      }
      setTimeout(() => setCurrentDate(newDate), 0);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      changeMonth('next');
    }
    if (isRightSwipe) {
      changeMonth('prev');
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    isMember: false,
    memberNumber: ''
  });

  // --- AUTH & DATA SYNC ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const qRes = query(collection(db, 'artifacts', appId, 'public', 'data', 'reservations'));
    const unsubRes = onSnapshot(qRes, (snapshot) => {
      const resData = [];
      const now = new Date();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let isExpired = false;
        if (data.status === 'pending' && data.createdAt) {
          const created = data.createdAt.toDate();
          const diffDays = (now - created) / (1000 * 60 * 60 * 24);
          if (diffDays > 5) {
            isExpired = true;
            deleteDoc(docSnap.ref);
          }
        }
        if (!isExpired) resData.push({ id: docSnap.id, ...data });
      });
      setReservations(resData);
    });

    const qAdmins = query(collection(db, 'artifacts', appId, 'public', 'data', 'admins'));
    const unsubAdmins = onSnapshot(qAdmins, (snapshot) => {
      const adData = [];
      snapshot.forEach(doc => adData.push({ id: doc.id, ...doc.data() }));
      setAdmins(adData);
    });

    return () => {
      unsubRes();
      unsubAdmins();
    };
  }, [user]);

  // --- HANDLERS ---

  const handleDayClick = (day) => {
    const blockStart = getBlockStart(day);
    const blockId = formatDateId(blockStart);
    const existing = reservations.find(r => r.id === blockId);
    
    setSelectedBlock({
      id: blockId,
      date: blockStart,
      reservation: existing || null
    });
    setIsModalOpen(true);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (adminUser.id === MASTER_ADMIN_ID && adminUser.pass === MASTER_ADMIN_PASS) {
      setIsAdminLoggedIn(true);
      setCurrentAdminId(MASTER_ADMIN_ID);
      setView('adminPanel');
      return;
    }
    const validSubAdmin = admins.find(a => a.memberId === adminUser.id && a.password === adminUser.pass);
    if (validSubAdmin) {
       setIsAdminLoggedIn(true);
       setCurrentAdminId(validSubAdmin.memberId);
       setView('adminPanel');
       return;
    }
    // Simple alert workaround in case environment blocks alerts, use visual feedback ideally but keeping simple
    console.log('Credenciales incorrectas');
  };

  const handleAddAdmin = async () => {
    if (!newAdminData.id || !newAdminData.pass) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admins', newAdminData.id), {
        memberId: newAdminData.id,
        password: newAdminData.pass,
        addedBy: currentAdminId,
        createdAt: serverTimestamp()
      });
      setNewAdminData({ id: '', pass: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAdmin = async (id) => {
      try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admins', id));
      } catch(e) { console.error(e); }
  };

  const handleUpdateAdminPass = async (id, newPass) => {
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admins', id), {
              password: newPass
          });
      } catch(e) { console.error(e); }
  };

  const handleReservation = async (e) => {
    e.preventDefault();
    if (!selectedBlock) return;
    const price = formData.isMember ? 100 : 300;
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reservations', selectedBlock.id), {
        startDate: selectedBlock.id,
        status: 'pending', 
        firstName: formData.firstName,
        lastName: formData.lastName,
        isMember: formData.isMember,
        memberNumber: formData.memberNumber || null,
        price: price,
        createdAt: serverTimestamp()
      });
      
      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', isMember: false, memberNumber: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedBlock?.reservation) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reservations', selectedBlock.id), {
        status: 'confirmed'
      });
      setIsModalOpen(false);
    } catch (e) {}
  };

  const handleCancelReservation = async () => {
    if (!selectedBlock?.reservation) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reservations', selectedBlock.id));
      setIsModalOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentAdminId('');
    setIsMenuOpen(false);
    setAdminUser({id:'', pass:''});
    setView('landing');
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust for Monday start (0 = Sunday in JS)
    const startDay = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
    
    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-transparent" />);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const blockStart = getBlockStart(date);
      const blockId = formatDateId(blockStart);
      
      // Check if this date is part of a "weekend block" (Thu-Mon approx)
      const isInBlock = isDateInBlock(date, blockStart);
      
      const reservation = reservations.find(r => r.id === blockId);
      
      // Styling logic
      let bgColor = 'bg-white/10';
      let borderColor = 'border-transparent';
      let textColor = 'text-white/30';
      let shadow = '';

      if (isInBlock) {
          textColor = 'text-gray-800';
          if (reservation) {
              if (reservation.status === 'confirmed') {
                  // PAGADO: Rojo Intenso
                  bgColor = 'bg-gradient-to-br from-red-600 to-red-800';
                  borderColor = 'border-red-900';
                  textColor = 'text-white';
                  shadow = 'shadow-red-900/50 shadow-lg';
              } else {
                  // PENDIENTE: Naranja Solar
                  bgColor = 'bg-gradient-to-br from-orange-400 to-orange-500';
                  borderColor = 'border-orange-600';
                  textColor = 'text-white';
                  shadow = 'shadow-orange-500/50 shadow-lg';
              }
          } else {
             // LIBRE: Verde Esmeralda
             bgColor = 'bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 cursor-pointer';
             borderColor = 'border-emerald-300'; 
             textColor = 'text-white font-black drop-shadow-md';
             shadow = 'shadow-emerald-500/30 shadow-lg';
          }
      }

      days.push(
        <button 
          key={d} 
          onClick={() => isInBlock ? handleDayClick(date) : null}
          disabled={!isInBlock}
          className={`h-20 sm:h-24 rounded-2xl border flex flex-col items-start justify-between p-2 transition-all relative ${bgColor} ${borderColor} ${shadow} ${isInBlock && !reservation ? 'hover:scale-[1.05] active:scale-95' : ''}`}
        >
          <span className={`text-lg font-bold ${textColor}`}>{d}</span>
          
          {reservation && isInBlock && (
              <div className="self-end bg-black/20 p-1.5 rounded-full backdrop-blur-sm">
                  {reservation.status === 'confirmed' 
                    ? <Check size={16} className="text-white" strokeWidth={3} /> 
                    : <Clock size={16} className="text-white" strokeWidth={3} />
                  }
              </div>
          )}
        </button>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
          <div key={day} className="text-center font-black text-white/50 text-xs py-2 uppercase tracking-wider">{day}</div>
        ))}
        {days}
      </div>
    );
  };

  if (!app) return <div className="p-10 text-center text-white bg-black h-screen flex items-center justify-center">Iniciando aplicación...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-black font-sans pb-10 selection:bg-red-500 selection:text-white">
      <style>{`
        @keyframes slideInRight { from { transform: translateX(50%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-50%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        .animate-slide-in-left { animation: slideInLeft 0.3s ease-out forwards; }
      `}</style>
      
      {view !== 'landing' && (
        <header className="bg-black/80 backdrop-blur-md text-white p-4 shadow-2xl sticky top-0 z-40 border-b border-red-900/50">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => setView('calendar')}>
               <div className="w-12 h-12 bg-gradient-to-br from-white to-gray-200 rounded-full flex items-center justify-center p-0.5 overflow-hidden shadow-red-500/20 shadow-lg border-2 border-red-600 group-hover:scale-105 transition-transform">
                  <UDRLogo className="w-full h-full object-contain" />
               </div>
               <div className="leading-none">
                 <h1 className="font-black text-xl italic tracking-tight text-white group-hover:text-red-400 transition-colors uppercase">Peña Unión</h1>
                 <h2 className="text-[10px] text-yellow-500 font-bold tracking-[0.2em] uppercase">Deportiva Roteña</h2>
               </div>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 bg-red-600/20 hover:bg-red-600 hover:text-white rounded-full transition-all border border-red-600/30 text-red-100">
              <Menu size={22} strokeWidth={2.5}/>
            </button>
          </div>
        </header>
      )}

      {isMenuOpen && view !== 'landing' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setIsMenuOpen(false)}>
            <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-gradient-to-b from-gray-900 to-black shadow-2xl p-6 flex flex-col animate-slide-in-right border-l border-red-900" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <span className="font-black text-2xl text-white italic">MENÚ</span>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"><X size={24}/></button>
                </div>
                <nav className="space-y-4 flex-1">
                    <button onClick={() => {setView('calendar'); setIsMenuOpen(false);}} className="w-full text-left p-4 hover:bg-red-900/30 rounded-2xl flex items-center gap-4 font-bold text-white transition-all border border-transparent hover:border-red-800">
                        <CalendarIcon size={24} className="text-red-500"/> Calendario
                    </button>
                    <button onClick={() => {setView('rules'); setIsMenuOpen(false);}} className="w-full text-left p-4 hover:bg-red-900/30 rounded-2xl flex items-center gap-4 font-bold text-white transition-all border border-transparent hover:border-red-800">
                        <Shield size={24} className="text-red-500"/> Normativa
                    </button>
                    {isAdminLoggedIn && (
                        <button onClick={() => {setView('adminPanel'); setIsMenuOpen(false);}} className="w-full text-left p-4 bg-gradient-to-r from-red-800 to-red-950 text-white rounded-2xl flex items-center gap-4 font-bold shadow-lg mt-6 border border-red-700">
                            <Users size={24}/> Panel Admin
                        </button>
                    )}
                </nav>
                <div className="pt-8 border-t border-white/10">
                    <button onClick={handleLogout} className="w-full p-4 text-red-400 bg-red-950/30 border border-red-900/50 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-red-900/50 hover:text-red-300 transition-all">
                        <LogOut size={20}/> CERRAR SESIÓN
                    </button>
                </div>
            </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto">
        {view === 'landing' && <LandingView onSelect={setView} />}
        {view === 'calendar' && (
          <div 
            className="p-4 space-y-6 animate-fade-in pb-20 min-h-[80vh]"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
             <div className="flex justify-between items-center mb-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-white/10">
                <button onClick={() => changeMonth('prev')} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"><ChevronRight className="rotate-180" size={24}/></button>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight italic drop-shadow-md">
                    {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => changeMonth('next')} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"><ChevronRight size={24}/></button>
             </div>
             
             <div key={currentDate.toISOString()} className={
                slideDirection === 'left' ? 'animate-slide-in-right' : 
                slideDirection === 'right' ? 'animate-slide-in-left' : 
                'animate-fade-in'
             }>
                {renderCalendar()}
             </div>
             
             <div className="grid grid-cols-3 gap-3 text-xs text-center mt-8">
                <div className="flex flex-col items-center gap-2 bg-gradient-to-b from-emerald-500 to-emerald-700 p-3 rounded-xl border border-emerald-400 shadow-lg transform hover:-translate-y-1 transition-transform">
                    <div className="w-3 h-3 rounded-full bg-white shadow-sm ring-4 ring-emerald-400/50"></div>
                    <span className="font-bold text-white uppercase tracking-wider">Libre</span>
                </div>
                <div className="flex flex-col items-center gap-2 bg-gradient-to-b from-orange-400 to-orange-600 p-3 rounded-xl border border-orange-300 shadow-lg transform hover:-translate-y-1 transition-transform">
                    <div className="w-3 h-3 rounded-full bg-white shadow-sm ring-4 ring-orange-400/50"></div>
                    <span className="font-bold text-white uppercase tracking-wider">Pendiente</span>
                </div>
                <div className="flex flex-col items-center gap-2 bg-gradient-to-b from-red-600 to-red-800 p-3 rounded-xl border border-red-500 shadow-lg transform hover:-translate-y-1 transition-transform">
                    <div className="w-3 h-3 rounded-full bg-white shadow-sm ring-4 ring-red-500/50"></div>
                    <span className="font-bold text-white uppercase tracking-wider">Pagado</span>
                </div>
             </div>
             
             <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-5 rounded-2xl border border-blue-700 text-sm text-blue-100 flex items-start gap-4 mt-6 shadow-xl">
                <div className="bg-blue-600 p-2 rounded-full shadow-inner"><Info className="shrink-0 text-white" size={20}/></div>
                <p className="leading-relaxed font-medium pt-1">Las reservas se realizan por <strong>Fin de Semana completo</strong>. Toca un día <strong className="text-emerald-300 uppercase">VERDE</strong> para comenzar tu solicitud.</p>
             </div>
          </div>
        )}
        {view === 'rules' && <NormsView onBack={() => setView('calendar')} />}
        {view === 'adminPanel' && <AdminPanel admins={admins} onExit={() => setView('calendar')} onAddAdmin={handleAddAdmin} onDeleteAdmin={handleDeleteAdmin} onUpdateAdminPass={handleUpdateAdminPass} newAdminData={newAdminData} setNewAdminData={setNewAdminData} currentAdminId={currentAdminId} />}
        {view === 'adminLogin' && (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
                <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-sm border-2 border-red-600 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-black to-red-600"></div>
                    <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-white ring-4 ring-red-100">
                        <Lock size={36}/>
                    </div>
                    <h2 className="text-3xl font-black text-center text-gray-900 mb-1 uppercase italic">Acceso Directiva</h2>
                    <p className="text-center text-gray-500 text-sm mb-8 font-bold tracking-wide">SOLO PERSONAL AUTORIZADO</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div><input type="text" placeholder="Nº Socio" className="w-full border-2 border-gray-200 bg-gray-50 rounded-xl p-4 text-lg font-bold outline-none focus:border-red-600 focus:bg-white transition-all text-center placeholder:text-gray-300" value={adminUser.id} onChange={e => setAdminUser({...adminUser, id: e.target.value})} /></div>
                        <div><input type="password" placeholder="Contraseña" className="w-full border-2 border-gray-200 bg-gray-50 rounded-xl p-4 text-lg font-bold outline-none focus:border-red-600 focus:bg-white transition-all text-center placeholder:text-gray-300" value={adminUser.pass} onChange={e => setAdminUser({...adminUser, pass: e.target.value})} /></div>
                        <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-black hover:bg-red-700 text-lg shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all mt-4 uppercase">Entrar</button>
                    </form>
                    <button onClick={() => setView('landing')} className="w-full text-center mt-6 text-sm text-gray-400 font-bold hover:text-red-600 transition-colors uppercase tracking-wider">Cancelar</button>
                </div>
            </div>
        )}
      </main>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedBlock={selectedBlock} formData={formData} setFormData={setFormData} onReservation={handleReservation} isAdminLoggedIn={isAdminLoggedIn} onConfirmPayment={handleConfirmPayment} onCancelReservation={handleCancelReservation} />
    </div>
  );
}
