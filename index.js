require('dotenv').config()
const express = require('express')
const axios = require('axios')
const qs = require('qs')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

async function getToken(){

 const r = await axios.post(
  'https://auth.v8sistema.com/oauth/token',
  qs.stringify({
   grant_type:'password',
   client_id:process.env.V8_CLIENT_ID,
   audience:'https://bff.v8sistema.com',
   username:process.env.V8_USER,
   password:process.env.V8_PASS
  }),
 {headers:{'Content-Type':'application/x-www-form-urlencoded'}}
 )

 return r.data.access_token
}

app.get('/',(req,res)=>{
 res.send('API ONLINE')
})

app.post('/simular', async(req,res)=>{
 try{
  const token = await getToken()

  const r = await axios.post(
   'https://bff.v8sistema.com/simulacao',
   req.body,
   {headers:{Authorization:`Bearer ${token}`}}
  )

  res.json(r.data)

 }catch(e){
  res.status(500).json({erro:true})
 }
})

const PORT = process.env.PORT || 3000
app.listen(PORT)
