require('dotenv').config()
const express = require('express')
const axios = require('axios')
const qs = require('qs')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// ================= TOKEN =================
async function getToken() {
 const r = await axios.post(
  'https://auth.v8sistema.com/oauth/token',
  qs.stringify({
   grant_type: 'password',
   client_id: process.env.V8_CLIENT_ID,
   audience: 'https://bff.v8sistema.com',
   username: process.env.V8_USER,
   password: process.env.V8_PASS,
   scope: 'offline_access'
  }),
  {
   headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }
 )
 return r.data.access_token
}

// ================= HOME =================
app.get('/', (req, res) => res.send('API ONLINE'))

// ================= GERAR TERMO =================
app.post('/clt/consult', async (req, res) => {
 try {
  const token = await getToken()

  const payload = {
   borrowerDocumentNumber: req.body.document_number,
   gender: req.body.gender,
   birthDate: req.body.birth_date,
   signerName: req.body.name,
   signerEmail: req.body.email,
   signerPhone: {
    phoneNumber: req.body.phone_number,
    countryCode: "55",
    areaCode: req.body.area_code
   }
  }

  const r = await axios.post(
   'https://bff.v8sistema.com/private-consignment/consult',
   payload,
   {
    headers: {
     Authorization: `Bearer ${token}`,
     'Content-Type': 'application/json'
    }
   }
  )

  res.json(r.data)

 } catch (e) {
  res.status(400).json(e.response?.data || { erro: true })
 }
})

// ================= BUSCAR CONSULTA =================
app.post('/clt/consult/find', async (req, res) => {
 try {
  const token = await getToken()

  const now = new Date()
  const startDate = req.body.startDate || new Date(now.getTime() - 30*24*60*60*1000).toISOString()
  const endDate = req.body.endDate || now.toISOString()

  const r = await axios.get(
   'https://bff.v8sistema.com/private-consignment/consult',
   {
    headers: { Authorization: `Bearer ${token}` },
    params: {
     limit: 50,
     page: 1,
     search: req.body.document_number,
     provedor: 'QI',
     startDate,
     endDate
    }
   }
  )

  const found = r.data?.data?.[0]

  if (!found) return res.status(404).json({ erro:true })

  res.json({
   consult_id: found.id,
   status: found.status
  })

 } catch (e) {
  res.status(400).json(e.response?.data || { erro: true })
 }
})

// ================= AUTORIZAR TERMO =================
app.post('/clt/consult/authorize', async (req, res) => {
 try {
  const token = await getToken()
  const consultId = req.body.consult_id

  const r = await axios.post(
   `https://bff.v8sistema.com/private-consignment/consult/${consultId}/authorize`,
   {},
   { headers:{ Authorization:`Bearer ${token}` }}
  )

  res.json({
   consult_id: consultId,
   status: 'WAITING_CONSENT'
  })

 } catch (e) {
  res.status(400).json(e.response?.data || { erro:true })
 }
})

// ================= OBTER MARGEM =================
app.post('/clt/consult/margem', async (req, res) => {
 try {
  const token = await getToken()
  const cpf = req.body.document_number

  const now = new Date()
  const startDate = new Date(now.getTime() - 30*24*60*60*1000).toISOString()
  const endDate = now.toISOString()

  const r = await axios.get(
   'https://bff.v8sistema.com/private-consignment/consult',
   {
    headers:{ Authorization:`Bearer ${token}` },
    params:{
     search: cpf,
     startDate,
     endDate,
     limit:50,
     page:1,
     provedor:'QI'
    }
   }
  )

  const found = r.data?.data?.[0]

  if(!found) return res.status(404).json({ erro:true })

  res.json({
   consult_id: found.id,
   status: found.status,
   availableMarginValue: found.availableMarginValue
  })

 } catch(e){
  res.status(400).json(e.response?.data || {erro:true})
 }
})

// ================= TAXAS =================
app.get('/clt/taxas', async (req,res)=>{
 const token = await getToken()
 const r = await axios.get(
  'https://bff.v8sistema.com/private-consignment/simulation/configs',
  { headers:{Authorization:`Bearer ${token}`}}
 )
 res.json(r.data)
})

// ================= SIMULAÇÃO =================
app.post('/clt/simular', async(req,res)=>{
 const token = await getToken()
 const r = await axios.post(
  'https://bff.v8sistema.com/private-consignment/simulation',
  req.body,
  { headers:{Authorization:`Bearer ${token}`}}
 )
 res.json(r.data)
})

// ================= PROPOSTA =================
app.post('/clt/proposta', async(req,res)=>{
 const token = await getToken()
 const r = await axios.post(
  'https://bff.v8sistema.com/private-consignment/operation',
  req.body,
  { headers:{Authorization:`Bearer ${token}`}}
 )
 res.json(r.data)
})

// ================= OPERAÇÕES =================
app.get('/clt/operacoes', async(req,res)=>{
 const token = await getToken()
 const r = await axios.get(
  'https://bff.v8sistema.com/private-consignment/operation',
  { headers:{Authorization:`Bearer ${token}`}, params:req.query }
 )
 res.json(r.data)
})

// ================= WEBHOOK =================
app.post('/clt/webhook',(req,res)=>{
 console.log(req.body)
 res.sendStatus(200)
})

const PORT = process.env.PORT || 10000
app.listen(PORT, ()=>console.log('API ONLINE',PORT))
