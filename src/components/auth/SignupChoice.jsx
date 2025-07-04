import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';

const SignupChoice = () => {
  const navigate = useNavigate();

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#F1F8F5',
      padding: '2rem'
    },
    card: {
      background: 'white',
      borderRadius: '15px',
      padding: '3rem',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
      maxWidth: '500px',
      width: '100%'
    },
    title: {
      fontSize: '2.2rem',
      color: '#2E7D32',
      textAlign: 'center',
      marginBottom: '2rem'
    },
    subtitle: {
      fontSize: '1.1rem',
      color: '#666',
      textAlign: 'center',
      marginBottom: '3rem'
    },
    buttonContainer: {
      display: 'flex',
      gap: '1rem',
      flexDirection: 'column'
    },
    button: {
      padding: '1.5rem',
      borderRadius: '8px',
      border: 'none',
      fontSize: '1.1rem',
      cursor: 'pointer',
      transition: 'transform 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem'
    },
    clientButton: {
      background: '#E8F5E9',
      color: '#2E7D32',
      '&:hover': {
        transform: 'translateY(-2px)',
        background: '#C8E6C9'
      }
    },
    vendorButton: {
      background: '#2E7D32',
      color: 'white',
      '&:hover': {
        transform: 'translateY(-2px)',
        background: '#1B5E20'
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Join Our Platform</h1>
        <p style={styles.subtitle}>Choose how you want to join our community</p>
        
        <div style={styles.buttonContainer}>
          <button 
            style={{...styles.button, ...styles.clientButton}}
            onClick={() => navigate('/signup/client')}
          >
            <i className="fas fa-user"></i>
            Join as a Client
          </button>
          
          <button 
            style={{...styles.button, ...styles.vendorButton}}
            onClick={() => navigate('/signup/vendor')}
          >
            <i className="fas fa-store"></i>
            Join as a Vendor
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupChoice;
