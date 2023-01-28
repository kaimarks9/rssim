/*global moment numeral _ m Dexie selects io*/

var withAs = (obj, cb) => cb(obj),
ors = array => array.find(Boolean),
ands = array => array.reduce((a, b) => a && b, true),

randomId = () => [1, 1].map(() =>
  Math.random().toString(36).slice(2)
).join(''),

between = (start, middle, end) => ands([
  start < middle, middle < end
]),

hari = (timestamp, hour) =>
  timestamp && moment(timestamp)
  .format('Do MMMM YYYY'+(hour ? ', hh:mm' : '')),

daysDifference = (start, end) =>
  Math.round((end - start) / (1000 * 60 * 60 * 24)),
  // miliseconds, seconds, minutes, hours

startOfTheDay = timestamp => +moment(
  moment(timestamp).format('YYYY-MM-DD')
),

tomorrow = timestamp => timestamp + 864e5,

rupiah = num => 'Rp '+numeral(num || 0).format('0,0'),

dbCall = (body, action) => io().emit('dbCall', body, action),

insertBoth = (collName, doc, cb) => withAs(
  _.merge(doc, {_id: randomId(), updated: _.now()}),
  obj => dbCall(
    {method: 'insertOne', collection: collName, document: obj},
    res => res && [
      cb && cb(res), db[collName].put(obj),
      io().emit('datachange', collName, doc)
    ]
  )
),

updateBoth = (collName, _id, doc, cb) => withAs(
  _.merge(doc, {_id, updated: _.now()}),
  // pastikan di server terupdate dulu, baru client
  obj => dbCall(
    {method: 'updateOne', collection: collName, document: obj, _id},
    res => res && [
      cb && cb(!!res), db[collName].put(obj),
      io().emit('datachange', collName, doc)
    ]
  )
),

deleteBoth = (collName, _id, cb) => dbCall(
  {method: 'deleteOne', collection: collName, _id},
  res => res && [cb && cb(res), db[collName].delete(_id)]
),

tarifInap = (masuk, keluar, tarif) =>
  (daysDifference(masuk, keluar) || 1) * 1000 * +tarif,

sanitize = string => string.replace(/\;/g, ''),

collNames = ['patients', 'goods', 'references', 'users', 'queue'],

state = {route: 'dashboard'}, comp = {},

menus = {
  registration: {
    full: 'Pendaftaran', icon: 'address-book',
    children: {
      icd: {full: 'Kodifikasi', icon: 'code'},
      queue: {full: 'Antrian', icon: 'stream'},
      queueClinic: {full: 'Antrian Klinik', icon: 'stream'}
    }
  },
  emergency: {full: 'IGD', icon: 'heartbeat'},
  outpatient: {full: 'Rawat Jalan', icon: 'walking'},
  inpatient: {
    full: 'Rawat Inap', icon: 'bed',
    children: {
      beds: {full: 'Daftar Kamar', icon: 'bed'},
      surgery: {full: 'Antrian Bedah', icon: 'procedures'},
      gizi: {full: 'Gizi', icon: 'utensils'}
    }
  },
  cashier: {full: 'Kasir', icon: 'cash-register'},
  storage: {
    full: 'Storage', icon: 'cubes',
    children: {
      transfer: {full: 'Amprah', icon: 'exchange-alt'}
    }
  },
  pharmacy: {full: 'Apotik', icon: 'pills'},
  laboratory: {full: 'Laboratorium', icon: 'flask'},
  radiology: {full: 'Radiologi', icon: 'radiation'},
  management: {
    full: 'Manajemen', icon: 'users',
    children: {
      users: {full: 'Pengguna', icon: 'users'},
      references: {full: 'Referensi', icon: 'file-contract'},
      database: {full: 'Database', icon: 'database'}
    }
  },
  gizi: {full: 'Gizi', icon: 'utensils'},
  telemed: {full: 'Telemedic', icon: 'headset'}
},

db = new Dexie('simrs'),

getDifference = name => db[name].toArray(array => dbCall(
  {
    method: 'getDifference', collection: name,
    clientColl: array.map(i =>
      _.pick(i, ['_id', 'updated'])
    )
  },
  res => res && [
    db[name].bulkPut(res),
    _.assign(state, {lastSync: _.now(), loading: false}),
    m.redraw()
  ]
)),

getDifferences = () => collNames.map(getDifference)

db.version(1).stores(collNames.reduce((res, inc) =>
  _.merge(res, {[inc]: '_id'})
, {}))
