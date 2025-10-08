#!/usr/bin/env python3

import streamlit as st
import os
import json
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.identity import DefaultAzureCredential
import pandas as pd

class UnderwritingWorkbench:
    def __init__(self):
        self.openai_client = AzureOpenAI(
            azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT'),
            api_key=os.getenv('AZURE_OPENAI_KEY'),
            api_version="2024-02-01"
        )
        
        self.search_client = SearchClient(
            endpoint=os.getenv('AZURE_SEARCH_ENDPOINT'),
            index_name="underwriting-guidelines",
            credential=DefaultAzureCredential()
        )

    def analyze_application(self, application_data):
        """Analyze insurance application using Azure OpenAI"""
        
        prompt = f"""
        Analyze this life insurance application and provide underwriting recommendations:
        
        Application Data:
        {json.dumps(application_data, indent=2)}
        
        Provide:
        1. Risk Assessment (Low/Medium/High)
        2. Premium Adjustment Recommendation
        3. Required Additional Documentation
        4. Approval/Decline Recommendation with Rationale
        5. Compliance Notes
        """
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert life insurance underwriter."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        return response.choices[0].message.content

    def search_guidelines(self, query):
        """Search underwriting guidelines"""
        
        results = self.search_client.search(
            search_text=query,
            top=5,
            include_total_count=True
        )
        
        return list(results)

def main():
    st.set_page_config(
        page_title="SageInsure Underwriting Workbench",
        page_icon="🛡️",
        layout="wide"
    )
    
    st.title("🛡️ SageInsure Underwriting Workbench")
    st.markdown("AI-powered underwriting analysis and decision support")
    
    workbench = UnderwritingWorkbench()
    
    # Sidebar for navigation
    st.sidebar.title("Navigation")
    page = st.sidebar.selectbox("Select Page", [
        "Application Analysis",
        "Guidelines Search", 
        "Risk Calculator",
        "Batch Processing"
    ])
    
    if page == "Application Analysis":
        st.header("📋 Application Analysis")
        
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.subheader("Applicant Information")
            
            # Basic info
            age = st.number_input("Age", min_value=18, max_value=100, value=35)
            gender = st.selectbox("Gender", ["Male", "Female"])
            smoker = st.selectbox("Smoker Status", ["Non-smoker", "Smoker", "Former smoker"])
            
            # Coverage details
            coverage_amount = st.number_input("Coverage Amount ($)", min_value=10000, value=500000, step=10000)
            policy_type = st.selectbox("Policy Type", ["Term Life", "Whole Life", "Universal Life"])
            
            # Medical history
            st.subheader("Medical History")
            medical_conditions = st.multiselect("Medical Conditions", [
                "Diabetes", "Hypertension", "Heart Disease", "Cancer", "Asthma", 
                "Depression", "Anxiety", "High Cholesterol", "Obesity"
            ])
            
            medications = st.text_area("Current Medications")
            
            # Lifestyle factors
            st.subheader("Lifestyle Factors")
            alcohol_use = st.selectbox("Alcohol Use", ["None", "Light", "Moderate", "Heavy"])
            exercise = st.selectbox("Exercise Frequency", ["None", "Light", "Moderate", "Heavy"])
            dangerous_activities = st.multiselect("Dangerous Activities", [
                "Skydiving", "Rock Climbing", "Racing", "Aviation", "Scuba Diving"
            ])
        
        with col2:
            st.subheader("Analysis Results")
            
            if st.button("Analyze Application", type="primary"):
                application_data = {
                    "age": age,
                    "gender": gender,
                    "smoker_status": smoker,
                    "coverage_amount": coverage_amount,
                    "policy_type": policy_type,
                    "medical_conditions": medical_conditions,
                    "medications": medications,
                    "alcohol_use": alcohol_use,
                    "exercise": exercise,
                    "dangerous_activities": dangerous_activities
                }
                
                with st.spinner("Analyzing application..."):
                    analysis = workbench.analyze_application(application_data)
                    st.markdown(analysis)
    
    elif page == "Guidelines Search":
        st.header("🔍 Guidelines Search")
        
        query = st.text_input("Search underwriting guidelines:")
        
        if query:
            with st.spinner("Searching guidelines..."):
                results = workbench.search_guidelines(query)
                
                for result in results:
                    with st.expander(f"📄 {result.get('title', 'Guideline')}"):
                        st.write(result.get('content', ''))
                        st.caption(f"Category: {result.get('category', 'N/A')} | Risk Level: {result.get('risk_level', 'N/A')}")
    
    elif page == "Risk Calculator":
        st.header("⚖️ Risk Calculator")
        
        st.info("Risk calculation based on actuarial tables and company guidelines")
        
        # Risk factors input
        col1, col2 = st.columns(2)
        
        with col1:
            age_risk = st.slider("Age Risk Factor", 0.5, 3.0, 1.0, 0.1)
            medical_risk = st.slider("Medical Risk Factor", 0.5, 5.0, 1.0, 0.1)
            lifestyle_risk = st.slider("Lifestyle Risk Factor", 0.5, 3.0, 1.0, 0.1)
        
        with col2:
            base_premium = st.number_input("Base Premium ($)", value=1000)
            
            # Calculate adjusted premium
            total_risk = age_risk * medical_risk * lifestyle_risk
            adjusted_premium = base_premium * total_risk
            
            st.metric("Total Risk Multiplier", f"{total_risk:.2f}")
            st.metric("Adjusted Premium", f"${adjusted_premium:,.2f}")
            
            if total_risk > 2.5:
                st.error("⚠️ High Risk - Consider decline or additional underwriting")
            elif total_risk > 1.5:
                st.warning("⚠️ Moderate Risk - Premium adjustment recommended")
            else:
                st.success("✅ Low Risk - Standard rates applicable")
    
    elif page == "Batch Processing":
        st.header("📊 Batch Processing")
        
        uploaded_file = st.file_uploader("Upload CSV file with applications", type=['csv'])
        
        if uploaded_file:
            df = pd.read_csv(uploaded_file)
            st.dataframe(df)
            
            if st.button("Process Batch"):
                st.info("Batch processing functionality coming soon...")

if __name__ == "__main__":
    main()