import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPersonDetail } from '../services/api';
import './PatientDetail.css';

interface PatientData {
  subject_id: string;
  name?: string;
  age?: number;
  room?: string;
  risk_level?: string;
  independence_index?: number;
  [key: string]: any;
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPatientDetail(id);
    }
  }, [id]);

  const loadPatientDetail = async (patientId: string) => {
    try {
      setLoading(true);
      const response = await getPersonDetail(patientId);
      setPatient(response.data);
    } catch (error) {
      console.error('Error loading patient detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading patient details...</div>;
  }

  if (!patient) {
    return <div className="error">Patient not found</div>;
  }

  return (
    <div className="patient-detail-page">
      <button className="back-button" onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </button>
      
      <div className="detail-content">
        <h1>{patient.name || `Patient ${patient.subject_id}`}</h1>
        <div className="detail-grid">
          <div className="detail-card">
            <h3>Basic Information</h3>
            <p>Subject ID: {patient.subject_id}</p>
            <p>Age: {patient.age || 'N/A'}</p>
            <p>Room: {patient.room || 'N/A'}</p>
            <p>Risk Level: {patient.risk_level || 'N/A'}</p>
          </div>
          
          <div className="detail-card">
            <h3>Additional Data</h3>
            <pre>{JSON.stringify(patient, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
