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
   headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
   }
  }
 )

 return r.data.access_token
}

app.get('/', (req, res) => res.send('API ONLINE'))

// ================= CONSULTA CPF =================
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

  return res.json(r.data)

 } catch (e) {

  const data = e.response?.data
  console.log('CONSULT ERROR:', data)

  // ===== CONSULTA JÁ EXISTE → RECUPERA =====
  if (data?.type === 'consult_already_exists_by_user_and_document_number') {

   const token = await getToken()

   const list = await axios.get(
    'https://bff.v8sistema.com/private-consignment/consult',
    {
     headers: {
      Authorization: `Bearer ${token}`
     },
     params: {
      limit: 50,
      page: 1,
      search: req.body.document_number,
      provedor: 'QI'
     }
    }
   )

   const found = list.data?.data?.[0]

   if (found) {
    return res.json({
     consult_id: found.id,
     reused: true,
     status: found.status
    })
   }
  }

  return res.status(400).json(data || { erro: true })
 }
})

// ================= TAXAS =================
app.get('/clt/taxas', async (req, res) => {
 try {

  const token = await getToken()

  const r = await axios.get(
   'https://bff.v8sistema.com/private-consignment/simulation/configs',
   {
    headers: {
     Authorization: `Bearer ${token}`
    }
   }
  )

  res.json(r.data)

 } catch (e) {
  res.status(500).json(e.response?.data || { erro: true })
 }
})

// ================= SIMULAÇÃO =================
app.post('/clt/simular', async (req, res) => {
 try {

  const token = await getToken()

  const r = await axios.post(
   'https://bff.v8sistema.com/private-consignment/simulation',
   req.body,
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

// ================= PROPOSTA =================
app.post('/clt/proposta', async (req, res) => {
 try {

  const token = await getToken()

  const r = await axios.post(
   'https://bff.v8sistema.com/private-consignment/operation',
   req.body,
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

// ================= OPERAÇÕES =================
app.get('/clt/operacoes', async (req, res) => {
 try {

  const token = await getToken()

  const r = await axios.get(
   'https://bff.v8sistema.com/private-consignment/operation',
   {
    headers: {
     Authorization: `Bearer ${token}`
    },
    params: req.query
   }
  )

  res.json(r.data)

 } catch (e) {
  res.status(400).json(e.response?.data || { erro: true })
 }
})

// ================= WEBHOOK =================
app.post('/clt/webhook', (req, res) => {
 console.log('WEBHOOK CLT:', req.body)
 res.sendStatus(200)
})

const PORT = process.env.PORT || 10000
app.listen(PORT, () => console.log('API rodando na porta', PORT))
