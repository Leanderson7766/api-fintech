require('dotenv').config()
const express = require('express')
const axios = require('axios')
const qs = require('qs')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

async function getToken() {
 const r = await axios.post(
  'https://auth.v8sistema.com/oauth/token',
  qs.stringify({
   grant_type: 'password',
   client_id: process.env.V8_CLIENT_ID,
   audience: 'https://bff.v8sistema.com',
   username: process.env.V8_USER,
   password: process.env.V8_PASS
  }),
  { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
 )
 return r.data.access_token
}

app.get('/', (req, res) => res.send('API ONLINE'))

// ================= CONSENTIMENTO =================
app.post('/clt/consent', async (req, res) => {
 try {
  const token = await getToken()
  const r = await axios.post(
   'https://bff.v8sistema.com/private-consignment/consent',
   req.body,
   { headers: { Authorization: `Bearer ${token}` } }
  )
  res.json(r.data)
 } catch (e) {
  res.status(500).json(e.response?.data || { erro: true })
 }
})

// ================= TAXAS =================
app.get('/clt/taxas', async (req, res) => {
 try {
  const token = await getToken()
  const r = await axios.get(
   'https://bff.v8sistema.com/private-consignment/simulation/configs',
   { headers: { Authorization: `Bearer ${token}` } }
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
   { headers: { Authorization: `Bearer ${token}` } }
  )
  res.json(r.data)
 } catch (e) {
  res.status(500).json(e.response?.data || { erro: true })
 }
})

// ================= PROPOSTA =================
app.post('/clt/proposta', async (req, res) => {
 try {
  const token = await getToken()
  const r = await axios.post(
   'https://bff.v8sistema.com/private-consignment/operation',
   req.body,
   { headers: { Authorization: `Bearer ${token}` } }
  )
  res.json(r.data)
 } catch (e) {
  res.status(500).json(e.response?.data || { erro: true })
 }
})

// ================= LISTAR OPERAÇÕES =================
app.get('/clt/operacoes', async (req, res) => {
 try {
  const token = await getToken()
  const r = await axios.get(
   'https://bff.v8sistema.com/private-consignment/operation',
   {
    headers: { Authorization: `Bearer ${token}` },
    params: req.query
   }
  )
  res.json(r.data)
 } catch (e) {
  res.status(500).json(e.response?.data || { erro: true })
 }
})

// ================= WEBHOOK =================
app.post('/clt/webhook', (req, res) => {
 console.log('WEBHOOK:', req.body)
 res.sendStatus(200)
})

const PORT = process.env.PORT || 3000
app.listen(PORT)
