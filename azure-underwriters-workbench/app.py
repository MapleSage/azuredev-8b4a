#!/usr/bin/env python3

import streamlit as st
import os
import json
import base64
from io import BytesIO
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import uuid

class UnderwritersWorkbench:
    def __init__(self):
        self.openai_client = AzureOpenAI(
            azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT'),
            api_key=os.getenv('AZURE_OPENAI_KEY'),
            api_version="2024-02-01"
        )
        
        self.search_client = SearchClient(
            endpoint=os.getenv('AZURE_SEARCH_ENDPOINT'),
            index_name="underwriting-guidelines",
            credential=AzureKeyCredential(os.getenv('AZURE_SEARCH_KEY'))
        )

    def analyze_document(self, document_content, document_type="application"):
        """Analyze insurance document using Azure OpenAI"""
        
        prompt = f"""
        Analyze this {document_type} document and provide comprehensive underwriting insights:
        
        Document Content:
        {document_content}
        
        Provide detailed analysis including:
        1. **Risk Assessment**: Overall risk level (Low/Medium/High) with specific factors
        2. **Medical History Review**: Key medical conditions, medications, and health indicators
        3. **Financial Analysis**: Income verification, coverage amount appropriateness
        4. **Lifestyle Factors**: Smoking, alcohol, dangerous activities, occupation risks
        5. **Red Flags**: Any discrepancies, missing information, or concerning patterns
        6. **Recommendations**: 
           - Approval/Decline/Further Review
           - Premium adjustments
           - Additional documentation needed
           - Special conditions or exclusions
        7. **Compliance Notes**: Regulatory considerations and documentation requirements
        
        Format as structured markdown with clear sections.
        """
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert life insurance underwriter with 20+ years of experience. Provide thorough, accurate, and compliant underwriting analysis."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2000
        )
        
        return response.choices[0].message.content

    def extract_key_data(self, document_content):
        """Extract structured data from document"""
        
        prompt = f"""
        Extract key underwriting data from this document and return as JSON:
        
        {document_content}
        
        Return JSON with these fields:
        {{
            "applicant_name": "",
            "age": 0,
            "gender": "",
            "coverage_amount": 0,
            "policy_type": "",
            "smoker_status": "",
            "medical_conditions": [],
            "medications": [],
            "occupation": "",
            "annual_income": 0,
            "risk_factors": [],
            "application_date": ""
        }}
        """
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Extract data accurately and return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except:
            return {}

    def search_guidelines(self, query):
        """Search underwriting guidelines"""
        try:
            results = self.search_client.search(
                search_text=query,
                top=5,
                include_total_count=True
            )
            return list(results)
        except:
            return []

    def calculate_risk_score(self, data):
        """Calculate risk score based on extracted data"""
        score = 0
        factors = []
        
        # Age factor
        age = data.get('age', 0)
        if age > 65:
            score += 30
            factors.append("Advanced age")
        elif age > 50:
            score += 15
            factors.append("Mature age")
        
        # Medical conditions
        conditions = data.get('medical_conditions', [])
        high_risk_conditions = ['diabetes', 'heart disease', 'cancer', 'stroke']
        for condition in conditions:
            if any(risk in condition.lower() for risk in high_risk_conditions):
                score += 25
                factors.append(f"High-risk condition: {condition}")
        
        # Smoker status
        if data.get('smoker_status', '').lower() in ['smoker', 'current smoker']:
            score += 20
            factors.append("Current smoker")
        
        # Coverage amount vs income
        coverage = data.get('coverage_amount', 0)
        income = data.get('annual_income', 1)
        if coverage > income * 20:
            score += 15
            factors.append("High coverage to income ratio")
        
        return min(score, 100), factors

def main():
    st.set_page_config(
        page_title="SageInsure Underwriters Workbench",
        page_icon="🏢",
        layout="wide"
    )
    
    st.title("🏢 SageInsure Underwriters Workbench")
    st.markdown("**AI-Powered Document Analysis & Risk Assessment Platform**")
    
    workbench = UnderwritersWorkbench()
    
    # Sidebar
    st.sidebar.title("📋 Navigation")
    page = st.sidebar.selectbox("Select Module", [
        "Document Analysis",
        "Risk Assessment", 
        "Guidelines Search",
        "Portfolio Dashboard",
        "Batch Processing"
    ])
    
    if page == "Document Analysis":
        st.header("📄 Document Analysis")
        
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.subheader("Document Upload")
            
            # Document type selection
            doc_type = st.selectbox("Document Type", [
                "Life Insurance Application",
                "Medical Records",
                "Financial Statement",
                "Attending Physician Statement",
                "Lab Results"
            ])
            
            # File upload
            uploaded_file = st.file_uploader(
                "Upload Document", 
                type=['pdf', 'txt', 'docx'],
                help="Upload insurance documents for AI analysis"
            )
            
            # Text input alternative
            st.markdown("**Or paste document text:**")
            document_text = st.text_area(
                "Document Content", 
                height=300,
                placeholder="Paste document content here for analysis..."
            )
            
            if st.button("🔍 Analyze Document", type="primary"):
                if uploaded_file or document_text:
                    content = document_text if document_text else "Document uploaded for analysis"
                    
                    with st.spinner("Analyzing document..."):
                        # Extract structured data
                        extracted_data = workbench.extract_key_data(content)
                        
                        # Perform analysis
                        analysis = workbench.analyze_document(content, doc_type.lower())
                        
                        # Store in session state
                        st.session_state['analysis'] = analysis
                        st.session_state['extracted_data'] = extracted_data
                        st.session_state['document_type'] = doc_type
                    
                    st.success("✅ Analysis complete!")
                else:
                    st.error("Please upload a document or paste text content")
        
        with col2:
            st.subheader("Analysis Results")
            
            if 'analysis' in st.session_state:
                # Display analysis
                st.markdown(st.session_state['analysis'])
                
                # Display extracted data
                if st.session_state.get('extracted_data'):
                    st.subheader("📊 Extracted Data")
                    data = st.session_state['extracted_data']
                    
                    # Key metrics
                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        st.metric("Applicant Age", data.get('age', 'N/A'))
                    with col_b:
                        st.metric("Coverage Amount", f"${data.get('coverage_amount', 0):,}")
                    with col_c:
                        st.metric("Annual Income", f"${data.get('annual_income', 0):,}")
                    
                    # Risk factors
                    if data.get('risk_factors'):
                        st.subheader("⚠️ Risk Factors")
                        for factor in data['risk_factors']:
                            st.warning(f"• {factor}")
            else:
                st.info("Upload and analyze a document to see results here")
    
    elif page == "Risk Assessment":
        st.header("⚖️ Risk Assessment Calculator")
        
        if 'extracted_data' in st.session_state:
            data = st.session_state['extracted_data']
            
            # Calculate risk score
            risk_score, risk_factors = workbench.calculate_risk_score(data)
            
            col1, col2 = st.columns([1, 1])
            
            with col1:
                # Risk score gauge
                fig = go.Figure(go.Indicator(
                    mode = "gauge+number+delta",
                    value = risk_score,
                    domain = {'x': [0, 1], 'y': [0, 1]},
                    title = {'text': "Risk Score"},
                    delta = {'reference': 50},
                    gauge = {
                        'axis': {'range': [None, 100]},
                        'bar': {'color': "darkblue"},
                        'steps': [
                            {'range': [0, 30], 'color': "lightgreen"},
                            {'range': [30, 70], 'color': "yellow"},
                            {'range': [70, 100], 'color': "red"}
                        ],
                        'threshold': {
                            'line': {'color': "red", 'width': 4},
                            'thickness': 0.75,
                            'value': 90
                        }
                    }
                ))
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)
                
                # Risk level
                if risk_score < 30:
                    st.success("🟢 **LOW RISK** - Standard rates applicable")
                elif risk_score < 70:
                    st.warning("🟡 **MEDIUM RISK** - Premium adjustment recommended")
                else:
                    st.error("🔴 **HIGH RISK** - Decline or significant premium increase")
            
            with col2:
                st.subheader("Risk Factors Analysis")
                
                if risk_factors:
                    for factor in risk_factors:
                        st.error(f"⚠️ {factor}")
                else:
                    st.success("✅ No significant risk factors identified")
                
                # Recommendations
                st.subheader("📋 Recommendations")
                
                if risk_score < 30:
                    st.markdown("""
                    - ✅ **Approve** at standard rates
                    - 📄 Standard policy terms
                    - 🔄 Annual review recommended
                    """)
                elif risk_score < 70:
                    st.markdown("""
                    - ⚖️ **Approve** with premium adjustment
                    - 📈 Rate increase: 25-50%
                    - 📋 Additional medical exam may be required
                    - 🔍 Semi-annual review
                    """)
                else:
                    st.markdown("""
                    - ❌ **Decline** or **Postpone**
                    - 🏥 Require additional medical documentation
                    - 👨‍⚕️ Attending physician statement needed
                    - 🔄 Re-evaluate in 6-12 months
                    """)
        else:
            st.info("Please analyze a document first to see risk assessment")
    
    elif page == "Guidelines Search":
        st.header("🔍 Underwriting Guidelines Search")
        
        query = st.text_input("Search Guidelines:", placeholder="e.g., diabetes underwriting, smoking rates, age limits")
        
        if query:
            with st.spinner("Searching guidelines..."):
                results = workbench.search_guidelines(query)
                
                if results:
                    for i, result in enumerate(results):
                        with st.expander(f"📄 Guideline {i+1}"):
                            st.write(result.get('content', 'No content available'))
                            st.caption(f"Category: {result.get('category', 'N/A')} | Risk Level: {result.get('risk_level', 'N/A')}")
                else:
                    st.warning("No guidelines found. Using mock data for demonstration.")
                    
                    # Mock guidelines
                    mock_guidelines = [
                        {
                            "title": "Diabetes Underwriting Guidelines",
                            "content": "Type 1 diabetes: Decline if diagnosed before age 40. Type 2 diabetes: Standard rates if well-controlled (HbA1c < 7.0%) with no complications.",
                            "category": "Medical",
                            "risk_level": "High"
                        },
                        {
                            "title": "Smoking Underwriting Standards", 
                            "content": "Current smokers: 100% rate increase. Former smokers: Standard rates after 12 months cessation with negative cotinine test.",
                            "category": "Lifestyle",
                            "risk_level": "Medium"
                        }
                    ]
                    
                    for guideline in mock_guidelines:
                        with st.expander(f"📄 {guideline['title']}"):
                            st.write(guideline['content'])
                            st.caption(f"Category: {guideline['category']} | Risk Level: {guideline['risk_level']}")
    
    elif page == "Portfolio Dashboard":
        st.header("📊 Portfolio Dashboard")
        
        # Mock portfolio data
        portfolio_data = {
            'Application Status': ['Approved', 'Pending', 'Declined', 'Under Review'],
            'Count': [45, 23, 12, 18],
            'Percentage': [46.9, 23.5, 12.2, 18.4]
        }
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Pie chart
            fig_pie = px.pie(
                values=portfolio_data['Count'],
                names=portfolio_data['Application Status'],
                title="Application Status Distribution"
            )
            st.plotly_chart(fig_pie, use_container_width=True)
        
        with col2:
            # Bar chart
            fig_bar = px.bar(
                x=portfolio_data['Application Status'],
                y=portfolio_data['Count'],
                title="Applications by Status"
            )
            st.plotly_chart(fig_bar, use_container_width=True)
        
        # Metrics
        col_a, col_b, col_c, col_d = st.columns(4)
        with col_a:
            st.metric("Total Applications", "98", "↑12%")
        with col_b:
            st.metric("Approval Rate", "46.9%", "↑2.1%")
        with col_c:
            st.metric("Avg Processing Time", "3.2 days", "↓0.5 days")
        with col_d:
            st.metric("Risk Score Avg", "42.5", "↓5.2")
    
    elif page == "Batch Processing":
        st.header("📊 Batch Processing")
        
        st.info("Upload multiple documents for batch analysis")
        
        uploaded_files = st.file_uploader(
            "Upload Multiple Documents",
            type=['pdf', 'txt', 'docx'],
            accept_multiple_files=True
        )
        
        if uploaded_files:
            st.success(f"✅ {len(uploaded_files)} files uploaded")
            
            if st.button("🚀 Process Batch"):
                progress_bar = st.progress(0)
                results = []
                
                for i, file in enumerate(uploaded_files):
                    progress_bar.progress((i + 1) / len(uploaded_files))
                    
                    # Mock processing
                    result = {
                        'filename': file.name,
                        'status': 'Processed',
                        'risk_score': 35 + (i * 5),
                        'recommendation': 'Approve' if (35 + i * 5) < 50 else 'Review'
                    }
                    results.append(result)
                
                # Display results
                df = pd.DataFrame(results)
                st.dataframe(df, use_container_width=True)
                
                # Download results
                csv = df.to_csv(index=False)
                st.download_button(
                    "📥 Download Results",
                    csv,
                    "batch_results.csv",
                    "text/csv"
                )

if __name__ == "__main__":
    main()