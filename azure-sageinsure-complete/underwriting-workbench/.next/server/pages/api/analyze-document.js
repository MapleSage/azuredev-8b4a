"use strict";(()=>{var e={};e.id=256,e.ids=[256],e.modules={1287:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},6705:e=>{e.exports=import("formidable")},2079:e=>{e.exports=import("openai")},7147:e=>{e.exports=require("fs")},7091:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{config:()=>l,default:()=>d,routeModule:()=>u});var n=a(1802),s=a(7153),i=a(6249),o=a(4157),c=e([o]);o=(c.then?(await c)():c)[0];let d=(0,i.l)(o,"default"),l=(0,i.l)(o,"config"),u=new n.PagesAPIRouteModule({definition:{kind:s.x.PAGES_API,page:"/api/analyze-document",pathname:"/api/analyze-document",bundlePath:"",filename:""},userland:o});r()}catch(e){r(e)}})},4157:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{config:()=>d,default:()=>handler});var n=a(2079),s=a(6705),i=a(7147),o=a.n(i),c=e([n,s]);[n,s]=c.then?(await c)():c;let d={api:{bodyParser:!1}},l=new n.AzureOpenAI({apiKey:process.env.AZURE_OPENAI_KEY,endpoint:process.env.AZURE_OPENAI_ENDPOINT,apiVersion:"2024-02-01"});async function handler(e,t){if("POST"!==e.method)return t.status(405).json({error:"Method not allowed"});try{let a;let r=(0,s.default)({}),[n,i]=await r.parse(e),c=Array.isArray(n.documentType)?n.documentType[0]:n.documentType,d=Array.isArray(i.file)?i.file[0]:i.file;if(!d)return t.status(400).json({error:"No file uploaded"});let u=o().readFileSync(d.filepath,"utf8"),p=`Analyze this ${"life"===c?"life insurance":"P&C insurance"} document and extract key information:

Document Content:
${u}

Please provide:
1. Document type classification
2. Key extracted data (applicant info, coverage details, risk factors)
3. Risk assessment (Low/Medium/High)
4. Summary of findings
5. Underwriting recommendations

Format the response as JSON with the following structure:
{
  "documentType": "string",
  "extractedData": {
    "applicantName": "string",
    "age": "number",
    "coverageAmount": "number",
    "riskFactors": ["array of strings"]
  },
  "riskLevel": "Low|Medium|High",
  "summary": "string",
  "recommendations": "string",
  "status": "Complete"
}`,m=await l.chat.completions.create({model:"gpt-4o",messages:[{role:"system",content:"You are an expert insurance underwriter. Analyze documents thoroughly and provide structured JSON responses."},{role:"user",content:p}],temperature:.1,max_tokens:2e3});try{a=JSON.parse(m.choices[0].message.content||"{}")}catch(e){a={documentType:"life"===c?"Life Insurance Application":"P&C Insurance Application",extractedData:{applicantName:"Sample Applicant",age:35,coverageAmount:5e5,riskFactors:["Standard risk profile"]},riskLevel:"Medium",summary:m.choices[0].message.content||"Analysis completed",recommendations:"Standard underwriting process recommended",status:"Complete"}}o().unlinkSync(d.filepath),t.status(200).json(a)}catch(e){console.error("Analysis error:",e),t.status(500).json({error:"Analysis failed"})}}r()}catch(e){r(e)}})}};var t=require("../../webpack-api-runtime.js");t.C(e);var __webpack_exec__=e=>t(t.s=e),a=t.X(0,[222],()=>__webpack_exec__(7091));module.exports=a})();