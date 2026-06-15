import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Trash2, Edit2, RotateCcw, Plus, AlertCircle, CheckCircle, Archive, MapPin, X, Image, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── MapLibre location-picker HTML (embedded in iframe) ── */
const MAP_PICKER_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.0.0/dist/maplibre-gl.min.js"><\/script>
<link href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.0.0/dist/maplibre-gl.min.css" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;font-family:'Segoe UI',sans-serif}
#map{position:absolute;inset:0}
#searchWrap{position:absolute;top:12px;left:12px;right:12px;z-index:20;display:flex;gap:8px}
#searchInput{flex:1;padding:11px 16px;border-radius:14px;border:none;font-size:14px;
  background:rgba(255,255,255,0.97);box-shadow:0 4px 20px rgba(0,0,0,0.2);outline:none}
#searchBtn{padding:11px 14px;border-radius:14px;border:none;background:#2563EB;color:#fff;cursor:pointer;
  font-size:14px;box-shadow:0 4px 16px rgba(37,99,235,0.4);white-space:nowrap}
#suggestions{position:absolute;top:64px;left:12px;right:12px;z-index:19;
  background:#fff;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,0.15);display:none;overflow:hidden}
.sug{padding:11px 16px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f5f9}
.sug:hover{background:#EFF6FF}
.sug-n{font-weight:700;color:#0F172A}
.sug-a{font-size:11px;color:#64748B}
#msg{position:absolute;top:66px;left:12px;right:12px;z-index:20;padding:9px 14px;
  border-radius:10px;font-size:13px;font-weight:600;display:none;text-align:center}
#ctrls{position:absolute;right:12px;top:74px;z-index:20;display:flex;flex-direction:column;gap:8px}
.fab{width:42px;height:42px;border-radius:12px;border:none;cursor:pointer;font-size:17px;
  background:rgba(255,255,255,0.95);box-shadow:0 2px 12px rgba(0,0,0,0.18);transition:transform .15s}
.fab:active{transform:scale(0.91)}
.fab.pri{background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff}
#card{position:absolute;bottom:0;left:0;right:0;z-index:30;
  background:rgba(8,18,37,0.97);border-radius:24px 24px 0 0;padding:0 18px 28px;
  transform:translateY(100%);transition:transform .38s cubic-bezier(.34,1.46,.64,1)}
#card.open{transform:translateY(0)}
#handle{width:40px;height:4px;border-radius:2px;background:#334155;margin:13px auto 16px}
#cname{font-size:13px;font-weight:600;color:#F8FAFC;margin-bottom:10px;
  line-height:1.5;word-break:break-word;white-space:normal}
#caddr{font-size:12px;color:#64748B;margin-bottom:14px;line-height:1.5;display:none}
#crow{display:flex;gap:10px;margin-bottom:16px}
.cb{flex:1;background:#0F172A;border-radius:12px;padding:10px 12px}
.cl{font-size:9px;color:#475569;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:3px}
.cv{font-size:15px;font-weight:800;color:#60A5FA}
#confBtn{width:100%;padding:14px;border-radius:16px;border:none;cursor:pointer;
  font-size:15px;font-weight:800;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;
  box-shadow:0 5px 20px rgba(37,99,235,0.5);transition:transform .15s}
#confBtn:active{transform:scale(0.97)}
#closeCard{position:absolute;top:13px;right:18px;background:none;border:none;cursor:pointer;font-size:18px;color:#64748B}
@keyframes dp{from{transform:translateY(-30px) scale(0.5);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
.pin{cursor:pointer;animation:dp .4s cubic-bezier(.34,1.56,.64,1)}
</style>
</head>
<body>
<div id="map"></div>
<div id="searchWrap">
  <input id="searchInput" placeholder="Search places, address, or coordinates…" autocomplete="off"/>
  <button id="searchBtn">🔍 Search</button>
</div>
<div id="suggestions"></div>
<div id="msg"></div>
<div id="ctrls">
  <button class="fab pri" id="gpsBtn">📍</button>
  <button class="fab" id="ziBtn">+</button>
  <button class="fab" id="zoBtn">−</button>
  <button class="fab" id="styBtn">🗺</button>
</div>
<div id="card">
  <div id="handle"></div>
  <button id="closeCard">✕</button>
  <div id="cname">Unnamed Location</div>
  <div id="caddr"></div>
  <div id="crow">
    <div class="cb"><div class="cl">Latitude</div><div class="cv" id="clat">—</div></div>
    <div class="cb"><div class="cl">Longitude</div><div class="cv" id="clng">—</div></div>
  </div>
  <button id="confBtn">✅ Confirm Location</button>
</div>
<script>
var selLat=null,selLng=null,selName='',selAddr='';
var curMarker=null,isSat=false,stmr=null;
var osmSt={version:8,sources:{o:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256}},layers:[{id:'o',type:'raster',source:'o'}]};
var satSt={version:8,sources:{s:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256}},layers:[{id:'s',type:'raster',source:'s'}]};
var map=new maplibregl.Map({container:'map',style:osmSt,center:[122.9697,10.6881],zoom:14,attributionControl:false});
function mkPin(){
  var d=document.createElement('div');
  d.className='pin';
  d.innerHTML='<svg width="32" height="44" viewBox="0 0 32 44"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 28 16 28S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#2563EB"/><circle cx="16" cy="16" r="6" fill="white"/></svg>';
  return d;
}
function showMsg(t,err){
  var e=document.getElementById('msg');
  e.textContent=t;e.style.display='block';
  e.style.background=err?'rgba(220,38,38,0.9)':'rgba(37,99,235,0.9)';
  e.style.color='#fff';
  setTimeout(function(){e.style.display='none';},3000);
}
function placePin(lat,lng,name,addr){
  selLat=lat;selLng=lng;selName=name||'';selAddr=addr||'';
  if(curMarker) curMarker.remove();
  curMarker=new maplibregl.Marker({element:mkPin(),anchor:'bottom'}).setLngLat([lng,lat]).addTo(map);
  // Show full address in the card
  document.getElementById('cname').textContent=name||'Dropped Pin';
  document.getElementById('cname').title=name||'';
  document.getElementById('caddr').textContent='';
  document.getElementById('clat').textContent=lat.toFixed(6);
  document.getElementById('clng').textContent=lng.toFixed(6);
  document.getElementById('card').classList.add('open');
}
map.on('click',function(e){
  placePin(e.lngLat.lat,e.lngLat.lng,'Locating...','');
  fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+e.lngLat.lat+'&lon='+e.lngLat.lng)
    .then(function(r){return r.json();})
    .then(function(d){
      // Use the full display_name as the address
      var fullAddr=d.display_name||'';
      selName=fullAddr;selAddr='';
      document.getElementById('cname').textContent=fullAddr||'Dropped Pin';
      document.getElementById('cname').title=fullAddr;
      document.getElementById('caddr').textContent='';
    }).catch(function(){document.getElementById('cname').textContent='Dropped Pin';});
});
function clearSug(){
  document.getElementById('suggestions').style.display='none';
  document.getElementById('suggestions').innerHTML='';
}
function doSearch(){
  clearSug();
  var q=document.getElementById('searchInput').value.trim();
  if(!q){showMsg('Please enter a search term',true);return;}
  showMsg('Searching…',false);
  fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(q)+'&limit=1')
    .then(function(r){return r.json();})
    .then(function(data){
      if(!data.length){showMsg('No results found',true);return;}
      var r=data[0];
      var lat=parseFloat(r.lat),lng=parseFloat(r.lon);
      // Use the full display_name as the address name
      map.flyTo({center:[lng,lat],zoom:16,duration:1200});
      placePin(lat,lng,r.display_name,r.display_name);
      showMsg('Location found!',false);
    }).catch(function(){showMsg('Search failed',true);});
}
document.getElementById('searchBtn').addEventListener('click',doSearch);
document.getElementById('searchInput').addEventListener('keydown',function(e){if(e.key==='Enter')doSearch();});
document.getElementById('searchInput').addEventListener('input',function(){
  var q=this.value.trim();
  clearTimeout(stmr);
  if(q.length<3){clearSug();return;}
  stmr=setTimeout(function(){
    fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(q)+'&limit=5')
      .then(function(r){return r.json();})
      .then(function(data){
        var el=document.getElementById('suggestions');
        if(!data.length){clearSug();return;}
        el.innerHTML='';
        data.forEach(function(r){
          var p=r.display_name.split(',');
          var d=document.createElement('div');
          d.className='sug';
          d.innerHTML='<div class="sug-n">'+p[0]+'</div><div class="sug-a">'+p.slice(1,3).join(',').trim()+'</div>';
          d.onclick=function(){
            document.getElementById('searchInput').value=p[0];
            clearSug();
            var lat=parseFloat(r.lat),lng=parseFloat(r.lon);
            map.flyTo({center:[lng,lat],zoom:16,duration:1200});
            // Use full display_name for the confirmed location
            placePin(lat,lng,r.display_name,r.display_name);
          };
          el.appendChild(d);
        });
        el.style.display='block';
      }).catch(function(){clearSug();});
  },400);
});
document.getElementById('gpsBtn').addEventListener('click',function(){
  if(!navigator.geolocation){showMsg('GPS not supported',true);return;}
  showMsg('Getting location…',false);
  navigator.geolocation.getCurrentPosition(function(p){
    var lat=p.coords.latitude,lng=p.coords.longitude;
    map.flyTo({center:[lng,lat],zoom:16,duration:1000});
    placePin(lat,lng,'My Current Location','');
    showMsg('Location set!',false);
  },function(){showMsg('GPS unavailable',true);},{enableHighAccuracy:true,timeout:10000});
});
document.getElementById('ziBtn').addEventListener('click',function(){map.zoomIn();});
document.getElementById('zoBtn').addEventListener('click',function(){map.zoomOut();});
document.getElementById('styBtn').addEventListener('click',function(){
  isSat=!isSat;
  map.setStyle(isSat?satSt:osmSt);
  this.textContent=isSat?'🛰':'🗺';
});
document.getElementById('closeCard').addEventListener('click',function(){document.getElementById('card').classList.remove('open');});
document.getElementById('confBtn').addEventListener('click',function(){
  if(selLat===null){showMsg('Please tap the map first',true);return;}
  window.parent.postMessage({type:'locationConfirmed',payload:{lat:selLat,lng:selLng,name:selName,address:selAddr}},'*');
});
<\/script>
</body>
</html>`;

// ── Single source of truth for incident types (matches mobile app) ──
const INCIDENT_TYPES = [
  { value: 'Theft', label: 'Theft', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20' },
  { value: 'Robbery', label: 'Robbery', color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20' },
  { value: 'Harassment', label: 'Harassment', color: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/20' },
  { value: 'Accident', label: 'Accident', color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20' },
  { value: 'Suspicious Activity', label: 'Suspicious Activity', color: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20' },
  { value: 'Other', label: 'Other', color: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20' },
];

// Map from lowercase → type definition for fast lookup
const TYPE_MAP = Object.fromEntries(INCIDENT_TYPES.map(t => [t.value.toLowerCase(), t]));

const getTypeBadge = (rawType) => {
  if (!rawType) return { label: 'Unknown', cls: INCIDENT_TYPES[5].color };
  const match = TYPE_MAP[rawType.toLowerCase()];
  if (match) return { label: match.label, cls: match.color };
  // Custom 'Other' text from mobile — show as-is with slate badge
  const label = rawType.charAt(0).toUpperCase() + rawType.slice(1);
  return { label, cls: INCIDENT_TYPES[5].color };
};

const CrimeManagementPage = () => {
  const [crimes, setCrimes] = useState([]);
  const [archivedCrimes, setArchivedCrimes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    location: '',
    crimeType: 'Theft',
    timestamp: new Date().toISOString().slice(0, 16),
  });
  const [otherCrimeType, setOtherCrimeType] = useState('');

  // Map picker modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [pickedName, setPickedName] = useState('');
  const iframeRef = useRef(null);

  // Photo lightbox state — photos loaded on demand from incident_photos collection
  const [photoModal, setPhotoModal] = useState(null); // { photos: [], index: 0 }
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const openPhotoModal = async (incidentId, photoCount) => {
    if (!photoCount || photoCount === 0) return;
    setLoadingPhotos(true);
    setPhotoModal({ photos: [], index: 0, loading: true });
    try {
      // Fetch all chunk documents for this incident (no orderBy = no composite index needed)
      const snap = await getDocs(
        query(collection(db, 'incident_photos'), where('incidentId', '==', incidentId))
      );

      // Group chunks by photoIndex, then sort by chunkIndex and concatenate
      const chunkMap = {}; // { photoIndex: { chunkIndex: chunk } }
      snap.docs.forEach(d => {
        const { photoIndex, chunkIndex, chunk, dataUrl } = d.data();
        if (dataUrl) {
          // Legacy single-document format
          if (!chunkMap[photoIndex ?? 0]) chunkMap[photoIndex ?? 0] = {};
          chunkMap[photoIndex ?? 0].full = dataUrl;
        } else if (chunk !== undefined) {
          if (!chunkMap[photoIndex]) chunkMap[photoIndex] = {};
          chunkMap[photoIndex][chunkIndex] = chunk;
        }
      });

      // Reconstruct each photo from its ordered chunks
      const photos = Object.keys(chunkMap)
        .sort((a, b) => Number(a) - Number(b))
        .map(pi => {
          const entry = chunkMap[pi];
          if (entry.full) return entry.full;
          return Object.keys(entry)
            .sort((a, b) => Number(a) - Number(b))
            .map(ci => entry[ci])
            .join('');
        })
        .filter(Boolean);

      setPhotoModal({ photos, index: 0, loading: false });
    } catch (err) {
      console.error('Failed to load photos:', err);
      setPhotoModal(null);
    } finally {
      setLoadingPhotos(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  // Listen for confirmed location from iframe map picker
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === 'locationConfirmed') {
        const { lat, lng, name } = e.data.payload;
        const locationName = name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setFormData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6), location: locationName }));
        setPickedName(locationName);
        setShowMapModal(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const activeCrimesData = await apiService.getCrimes();
      const archivedCrimesData = await apiService.getArchivedCrimes();
      const incidentsData = await apiService.getIncidents();
      setCrimes(activeCrimesData);
      setArchivedCrimes(archivedCrimesData);
      // getIncidents now returns a plain array
      setIncidents(Array.isArray(incidentsData) ? incidentsData : (incidentsData.incidents || []));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiService.updateCrime(editingId, {
          ...formData,
          crimeType: formData.crimeType === 'Other' ? (otherCrimeType.trim() || 'Other') : formData.crimeType,
          timestamp: new Date(formData.timestamp).toISOString(),
        });
      } else {
        await apiService.createCrime({
          ...formData,
          crimeType: formData.crimeType === 'Other' ? (otherCrimeType.trim() || 'Other') : formData.crimeType,
          timestamp: new Date(formData.timestamp).toISOString(),
        });
      }
      fetchData();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        latitude: '',
        longitude: '',
        location: '',
        crimeType: 'Theft',
        timestamp: new Date().toISOString().slice(0, 16),
      });
      setOtherCrimeType('');
      setPickedName('');
    } catch (error) {
      console.error('Failed to save crime:', error);
    }
  };

  const handleArchive = async (id) => {
    try {
      await apiService.archiveCrime(id);
      fetchData();
    } catch (error) {
      console.error('Failed to archive crime:', error);
    }
  };

  const handleRestore = async (id) => {
    try {
      await apiService.restoreCrime(id);
      fetchData();
    } catch (error) {
      console.error('Failed to restore crime:', error);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleUpdateIncidentStatus = async (id, newStatus) => {
    try {
      await apiService.updateIncident(id, newStatus);
      fetchData();
    } catch (error) {
      console.error('Failed to update incident:', error);
    }
  };

  const handleApproveIncident = async (incident) => {
    try {
      // Mark incident as approved in Firestore (removes it from 'pending' list)
      await apiService.approveIncident(incident.id);

      // Create a corresponding crime record from the incident data
      await apiService.createCrime({
        latitude: incident.lat || incident.latitude || 0,
        longitude: incident.lng || incident.longitude || 0,
        location: incident.location || '',
        crimeType: incident.type || 'Other',
        timestamp: incident.timestamp || new Date().toISOString(),
      });

      // Refresh the data
      fetchData();
    } catch (error) {
      console.error('Failed to approve incident:', error);
    }
  };

  const handleArchiveIncident = async (id) => {
    try {
      // Mark as archived so it leaves the pending list
      await apiService.updateIncident(id, 'archived');
      fetchData();
    } catch (error) {
      console.error('Failed to archive incident:', error);
    }
  };

  const handleEdit = (crime) => {
    setEditingId(crime.id);
    const loc = crime.location || (crime.latitude && crime.longitude
      ? `${parseFloat(crime.latitude).toFixed(6)}, ${parseFloat(crime.longitude).toFixed(6)}`
      : '');
    setFormData({
      latitude: crime.latitude,
      longitude: crime.longitude,
      location: loc,
      crimeType: crime.crime_type,
      timestamp: new Date(crime.timestamp).toISOString().slice(0, 16),
    });
    setPickedName(loc);
    setShowForm(true);
  };

  if (loading) return (
    <div className="p-8 flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  );

  const displayCrimes = activeTab === 'active' ? crimes : archivedCrimes;
  const currentList = activeTab === 'incidents' ? incidents : displayCrimes;
  const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
  const pagedItems = currentList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Incident <span className="text-primary-600 dark:text-primary-500 font-light">Management</span></h1>
        {activeTab !== 'incidents' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-50 dark:bg-primary-600/20 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30 px-5 py-2.5 rounded-xl flex items-center hover:bg-primary-500 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] dark:shadow-[0_0_15px_rgba(59,130,246,0.15)] group"
          >
            <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Add Report
          </button>
        )}
      </div>

      {/* Form - Only show for crimes tab */}
      {showForm && activeTab !== 'incidents' && (
        <div className="glass-card p-6 mb-8 border-t-4 border-t-primary-500">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{editingId ? 'Edit Incident Report' : 'Add New Incident Report'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── Map Location Picker (replaces plain lat/lng inputs) ── */}
            <div className="md:col-span-2">
              <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Incident Location</label>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left
                  ${formData.latitude
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-600/10'
                    : 'border-dashed border-slate-300 dark:border-white/15 bg-white/30 dark:bg-white/5 hover:border-primary-400'
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${formData.latitude ? 'bg-primary-500' : 'bg-slate-100 dark:bg-white/10'
                  }`}>
                  <MapPin size={22} className={formData.latitude ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  {formData.latitude ? (
                    <>
                      <p className="text-sm font-700 text-slate-900 dark:text-white font-semibold truncate">{pickedName || 'Custom Pin'}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs font-mono bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-lg">
                          LAT {formData.latitude}
                        </span>
                        <span className="text-xs font-mono bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-lg">
                          LNG {formData.longitude}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Click to pick location on map</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Search, tap, or use GPS to select</p>
                    </>
                  )}
                </div>
                <span className="text-xs text-primary-500 font-semibold flex-shrink-0">
                  {formData.latitude ? 'Change' : 'Select'} →
                </span>
              </button>
              {/* Hidden required inputs to carry values into form submission */}
              <input type="hidden" name="latitude" value={formData.latitude} required />
              <input type="hidden" name="longitude" value={formData.longitude} required />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Incident Type</label>
              <select
                value={formData.crimeType}
                onChange={(e) => setFormData({ ...formData, crimeType: e.target.value })}
                className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white transition-all dark:[&>option]:bg-dark-800"
              >
                {INCIDENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Custom type field when Other is selected */}
            {formData.crimeType === 'Other' && (
              <div>
                <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Specify Type</label>
                <input
                  type="text"
                  placeholder="e.g. Flooding, Fire, Lost Item..."
                  value={otherCrimeType}
                  onChange={(e) => setOtherCrimeType(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white transition-all"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                className="w-full px-4 py-3 bg-white/50 dark:bg-dark-900/50 border border-slate-300 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white transition-all dark:[color-scheme:dark]"
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-4 mt-2">
              <button type="submit" className="flex-1 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium py-3 rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-900">
                {editingId ? 'Update' : 'Add'} Incident
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setOtherCrimeType('');
                }}
                className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-medium py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Map Picker Modal ── */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ width: 'min(800px,95vw)', height: 'min(620px,90vh)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <MapPin size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-none">Pick Incident Location</h3>
                  <p className="text-white/70 text-xs mt-0.5">Search or tap anywhere on the map</p>
                </div>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
            {/* Iframe map */}
            <iframe
              ref={iframeRef}
              title="location-picker"
              srcDoc={MAP_PICKER_HTML}
              className="flex-1 w-full border-0"
              allow="geolocation"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-6 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-fit border border-slate-200 dark:border-white/10 shadow-lg">
        <button
          onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === 'active' ? 'bg-primary-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Active Incidents ({crimes.length})
        </button>
        <button
          onClick={() => { setActiveTab('archived'); setCurrentPage(1); }}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === 'archived' ? 'bg-primary-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Archived ({archivedCrimes.length})
        </button>
        <button
          onClick={() => { setActiveTab('incidents'); setCurrentPage(1); }}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === 'incidents' ? 'bg-primary-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          User Reports ({incidents.length})
        </button>
      </div>

      {/* Crime/Incident Table */}
      <div className="glass-card overflow-hidden">
        {activeTab !== 'incidents' ? (
          // Crime Table
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-white/[0.02]">
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-sm tracking-wider uppercase">
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">Date & Time</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {pagedItems.map((crime) => (
                  <tr key={crime.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="p-4 text-sm font-medium text-slate-700 dark:text-gray-300">{crime.id.substring(0, 8)}</td>
                    <td className="p-4 text-sm">
                      {(() => {
                        // Firestore stores as crime_type (from backend) or crimeType (from admin form)
                        const rawType = crime.crime_type || crime.crimeType || crime.type;
                        const { label, cls } = getTypeBadge(rawType); return (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400 max-w-xs">
                      {crime.location
                        ? <span className="truncate block" title={crime.location}>{crime.location}</span>
                        : crime.latitude && crime.longitude
                          ? <span className="font-mono text-xs">{parseFloat(crime.latitude).toFixed(4)}, {parseFloat(crime.longitude).toFixed(4)}</span>
                          : <span className="text-slate-400">N/A</span>
                      }
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400">{new Date(crime.timestamp).toLocaleString()}</td>
                    <td className="p-4 flex gap-3">
                      {activeTab === 'active' ? (
                        <>
                          <button
                            onClick={() => handleEdit(crime)}
                            className="p-2 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleArchive(crime.id)}
                            className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors"
                            title="Archive"
                          >
                            <Archive size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(crime.id)}
                          className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                          title="Restore"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Incident Table
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-white/[0.02]">
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 text-sm tracking-wider uppercase">
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Barangay</th>
                  <th className="text-left p-4 font-medium">Description</th>
                  <th className="text-left p-4 font-medium">Photos</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {pagedItems.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="p-4 text-sm text-slate-700 dark:text-gray-300 font-mono">{incident.id.substring(0, 8)}</td>
                    <td className="p-4 text-sm">
                      {(() => {
                        const { label, cls } = getTypeBadge(incident.type); return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
                            <AlertCircle size={12} />{label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-sm">
                      {incident.brgy ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20">
                          🏘️ Brgy. {incident.brgy}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400 max-w-xs truncate">{incident.description}</td>
                    <td className="p-4">
                      {(incident.photoCount > 0 || (incident.photos && incident.photos.length > 0)) ? (
                        <button
                          onClick={() => openPhotoModal(incident.id, incident.photoCount || incident.photos?.length)}
                          disabled={loadingPhotos}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                        >
                          <Image size={12} />
                          {loadingPhotos ? 'Loading…' : `${incident.photoCount || incident.photos?.length} photo${(incident.photoCount || incident.photos?.length) !== 1 ? 's' : ''}`}
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400">{incident.location}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400">{new Date(incident.timestamp).toLocaleString()}</td>
                    <td className="p-4 flex gap-3">
                      <button
                        onClick={() => handleApproveIncident(incident)}
                        className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
                        title="Approve and move to active incidents"
                      >
                        <CheckCircle size={16} />
                        <span className="text-xs font-medium">Verify</span>
                      </button>
                      <button
                        onClick={() => handleArchiveIncident(incident.id)}
                        className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-2"
                        title="Archive this report"
                      >
                        <Archive size={16} />
                        <span className="text-xs font-medium">Archive</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {currentList.length === 0 && (
          <div className="p-12 text-center text-slate-500 dark:text-gray-500 flex flex-col items-center gap-3">
            <Archive size={40} className="text-slate-200 dark:text-white/10" />
            <p>No {activeTab === 'incidents' ? 'user reports' : 'incidents'} found in this category</p>
          </div>
        )}

        {/* ── Pagination Bar ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <p className="text-sm text-slate-500 dark:text-gray-400">
              Showing <span className="font-semibold text-slate-700 dark:text-white">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, currentList.length)}</span> of <span className="font-semibold text-slate-700 dark:text-white">{currentList.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                        item === currentPage
                          ? 'bg-primary-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.4)]'
                          : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )
              }
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Photo Lightbox Modal ── */}
      {photoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPhotoModal(null)}
        >
          <div
            className="relative flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute -top-12 right-0 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <X size={18} className="text-white" />
            </button>

            {photoModal.loading ? (
              <div className="text-white text-sm animate-pulse px-8 py-12">Loading photos…</div>
            ) : photoModal.photos.length === 0 ? (
              <div className="text-white/60 text-sm px-8 py-12">No photos found</div>
            ) : (
              <>
                {/* Main image */}
                <div className="relative">
                  <img
                    src={photoModal.photos[photoModal.index]}
                    alt={`Evidence ${photoModal.index + 1}`}
                    className="max-h-[70vh] max-w-[85vw] rounded-2xl shadow-2xl object-contain"
                  />
                  {/* Prev / Next arrows */}
                  {photoModal.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setPhotoModal(p => ({ ...p, index: (p.index - 1 + p.photos.length) % p.photos.length }))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-xl flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft size={20} className="text-white" />
                      </button>
                      <button
                        onClick={() => setPhotoModal(p => ({ ...p, index: (p.index + 1) % p.photos.length }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-xl flex items-center justify-center transition-colors"
                      >
                        <ChevronRight size={20} className="text-white" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails strip */}
                {photoModal.photos.length > 1 && (
                  <div className="flex gap-2">
                    {photoModal.photos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoModal(p => ({ ...p, index: i }))}
                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                          i === photoModal.index
                            ? 'border-primary-400 scale-105'
                            : 'border-white/20 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Counter */}
                <p className="text-white/60 text-sm">
                  {photoModal.index + 1} / {photoModal.photos.length}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrimeManagementPage;
