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

  res.json(r.data)

 } catch (e) {
  console.log('CONSULT ERROR:', e.response?.data)
  res.status(400).json(e.response?.data || { erro: true })
 }
})

// ================= BUSCAR CONSULTA EXISTENTE =================
app.post('/clt/consult/find', async (req, res) => {
 try {
  const token = await getToken()

  const now = new Date()
  const startDate = req.body.startDate || new Date(now.getTime() - 30*24*60*60*1000).toISOString() // últimos 30 dias
  const endDate = req.body.endDate || now.toISOString()

  const r = await axios.get(
   'https://bff.v8sistema.com/private-consignment/consult',
   {
    headers: { Authorization: `Bearer ${token}` },
    params: {
     limit: req.body.limit || 50,
     page: req.body.page || 1,
     search: req.body.document_number,
     provedor: req.body.provedor || 'QI',
     startDate,
     endDate
    }
   }
  )

  const found = r.data?.data?.[0]

  if (!found) {
   return res.status(404).json({
    erro: true,
    message: 'Nenhuma consulta encontrada neste período'
   })
  }

  res.json({
   consult_id: found.id,
   status: found.status,
   reused: true
  })

 } catch (e) {
  console.log('FIND CONSULT ERROR:', e.response?.data || e.message)
  res.status(400).json(e.response?.data || { erro: true })
 }
})

// ================= AUTORIZAR / REENVIAR TERMO DE CONSENTIMENTO =================
app.post('/clt/consult/authorize', async (req, res) => {
 try {
  const token = await getToken()
  const consultId = req.body.consult_id

  if (!consultId) {
   return res.status(400).json({ erro: true, message: 'consult_id é obrigatório' })
  }

  const r = await axios.post(
   `https://bff.v8sistema.com/private-consignment/consult/${consultId}/authorize`,
   {}, // corpo vazio
   {
    headers: {
     Authorization: `Bearer ${token}`,
     'Content-Type': 'application/json'
    }
   }
  )

  res.json({
   message: 'Link de consentimento enviado / autorizado',
   consult_id: consultId,
   status: r.data?.status || 'WAITING_CONSENT'
  })

 } catch (e) {
  console.log('AUTHORIZE CONSULT ERROR:', e.response?.data || e.message)
  res.status(400).json(e.response?.data || { erro: true })
 }
})
// ================= OBTER MARGEM DISPONÍVEL =================
app.post('/clt/consult/margem', async (req, res) => {
    try {
        const token = await getToken();
        const documentNumber = req.body.document_number;

        if (!documentNumber) {
            return res.status(400).json({ erro: true, message: 'document_number é obrigatório' });
        }

        // Datas para busca (últimos 30 dias por padrão)
        const now = new Date();
        const startDate = req.body.startDate || new Date(now.getTime() - 30*24*60*60*1000).toISOString();
        const endDate = req.body.endDate || now.toISOString();

        const r = await axios.get(
            'https://bff.v8sistema.com/private-consignment/consult',
            {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    search: documentNumber,
                    startDate,
                    endDate,
                    limit: req.body.limit || 50,
                    page: req.body.page || 1,
                    provedor: req.body.provedor || 'QI'
                }
            }
        );

        const found = r.data?.data?.find(item => item.documentNumber === documentNumber);

        if (!found) {
            return res.status(404).json({
                erro: true,
                message: 'Nenhum termo de consentimento encontrado para este CPF neste período'
            });
        }

        res.json({
            consult_id: found.id,
            status: found.status,
            status_traduzido: (() => {
                switch (found.status) {
                    case "WAITING_CONSENT": return "Aguardando aceite do termo";
                    case "CONSENT_APPROVED": return "Termo aceito";
                    case "WAITING_CONSULT": return "Consulta em processamento";
                    case "WAITING_CREDIT_ANALYSIS": return "Aguardando análise de crédito";
                    case "SUCCESS": return "Consulta concluída com sucesso";
                    case "FAILED": return "Consulta falhou";
                    case "REJECTED": return "Consulta rejeitada";
                    default: return "Status desconhecido";
                }
            })(),
            availableMarginValue: found.availableMarginValue
        });

    } catch (e) {
        console.log('MARGEM CONSULT ERROR:', e.response?.data || e.message);
        res.status(400).json(e.response?.data || { erro: true });
    }
});

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
    headers: { Authorization: `Bearer ${token}` },
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
