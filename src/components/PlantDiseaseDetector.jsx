import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
    Camera, Upload, Loader, CheckCircle, AlertTriangle, Info, 
    Leaf, Zap, TrendingUp, Clock, Shield, Award,
    Bot, Send, MessageCircle
} from 'lucide-react';
import smartChatbot from '../services/smartChatbotService';
// NEW: role contexts
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';

// AI Service URL for plant disease detection
const AI_SERVICE_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_AI_SERVICE_BASE) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_AI_SERVICE_BASE) ||
  'http://localhost:5001';

// Backend API base URL
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  'http://localhost:5005/api';

// Plant disease detection endpoint
const DETECT_PATH =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PLANT_DETECT_PATH) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_PLANT_DETECT_PATH) ||
  '/predict';

const ALLOWED_ROLES = ['vendor', 'client', 'admin'];

// Plant options for improved detection accuracy
const PLANT_OPTIONS = [
    { value: '', label: 'Auto-detect (let AI decide)' },
    { value: 'apple', label: '🍎 Apple' },
    { value: 'cherry', label: '🍒 Cherry' },
    { value: 'corn', label: '🌽 Corn/Maize' },
    { value: 'grape', label: '🍇 Grape' },
    { value: 'orange', label: '🍊 Orange' },
    { value: 'peach', label: '🍑 Peach' },
    { value: 'pepper', label: '🌶️ Bell Pepper' },
    { value: 'potato', label: '🥔 Potato' },
    { value: 'raspberry', label: '🫐 Raspberry' },
    { value: 'soybean', label: '🫘 Soybean' },
    { value: 'squash', label: '🎃 Squash' },
    { value: 'strawberry', label: '🍓 Strawberry' },
    { value: 'tomato', label: '🍅 Tomato' },
    { value: 'blueberry', label: '🫐 Blueberry' },
    { value: 'wheat', label: '🌾 Wheat' },
    { value: 'rice', label: '🌾 Rice' },
    { value: 'cotton', label: '🌱 Cotton' }
];

// Compact the detection result before sending to chat
const buildContextFromResult = (res) => {
  if (!res) return null;
  return {
    prediction: {
      plant: res?.prediction?.plant,
      disease: res?.prediction?.disease,
      is_healthy: res?.prediction?.is_healthy,
      confidence: res?.prediction?.confidence,
    },
    recommendation: res?.recommendation,
    disease_info: {
      severity: res?.disease_info?.severity,
      treatment: res?.disease_info?.treatment,
      prevention: res?.disease_info?.prevention,
    },
  };
};

const PlantDiseaseDetector = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedPlant, setSelectedPlant] = useState(''); // New: plant name selection
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Analysis tabs + chatbot states
    const [activeAnalysisTab, setActiveAnalysisTab] = useState('detection'); // 'detection' | 'chat' | 'history'
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    // New: persistent chat user id
    const [chatUserId, setChatUserId] = useState(null);
    
    // History states
    const [detectionHistory, setDetectionHistory] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

    // NEW: auth state
    const [auth, setAuth] = useState({ token: null, role: null, ready: false });
    const [authError, setAuthError] = useState('');

    // Helpers - moved up to avoid initialization issues
    const isAuthorized = Boolean(auth.token && auth.role);

    // NEW: consume auth contexts
    const vendorAuth = useVendorAuth?.();
    const clientAuth = useClientAuth?.();
    const adminAuth = useAdminAuth?.();

    // Prefer contexts; fallback to stored token/role
    useEffect(() => {
        // Resolve from contexts first
        let token = null;
        let role = null;

        // Check AdminAuth context (has isAuthenticated property)
        if (adminAuth?.isAuthenticated && adminAuth?.token) {
            token = adminAuth.token;
            role = 'admin';
        } 
        // Check VendorAuth context (has user and token properties)
        else if (vendorAuth?.user && vendorAuth?.token) {
            token = vendorAuth.token;
            role = 'vendor';
        } 
        // Check ClientAuth context (has user and token properties)
        else if (clientAuth?.user && clientAuth?.token) {
            token = clientAuth.token;
            role = 'client';
        } 
        else {
            // fallback to storage - check for specific auth tokens
            const adminToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
            const vendorToken = sessionStorage.getItem('vendorToken');
            const clientToken = localStorage.getItem('clientToken');
            
            if (adminToken) {
                token = adminToken;
                role = 'admin';
            } else if (vendorToken) {
                token = vendorToken;
                role = 'vendor';
            } else if (clientToken) {
                token = clientToken;
                role = 'client';
            } else {
                // final fallback to generic storage
                token =
                  localStorage.getItem('authToken') ||
                  localStorage.getItem('token') ||
                  localStorage.getItem('access_token') ||
                  null;
                const storedRole =
                  (localStorage.getItem('userRole') ||
                   localStorage.getItem('role') ||
                   '').toLowerCase();
                role = storedRole || null;
            }
        }

        // Set axios header for all requests (smartChatbotService included)
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          delete axios.defaults.headers.common['Authorization'];
        }

        const allowed = ['vendor', 'client', 'admin'];
        const validRole = allowed.includes(role || '') ? role : null;
        
        // Debug log to help troubleshoot
        console.log('PlantDiseaseDetector Auth Debug:', {
            adminAuth: adminAuth?.isAuthenticated ? 'authenticated' : 'not authenticated',
            vendorAuth: vendorAuth?.user ? 'authenticated' : 'not authenticated', 
            clientAuth: clientAuth?.user ? 'authenticated' : 'not authenticated',
            resolvedToken: token ? 'has token' : 'no token',
            resolvedRole: validRole,
            finalAuth: { token: !!token, role: validRole }
        });
        
        setAuth({ token, role: validRole, ready: true });
        setAuthError(!token || !validRole ? 'Sign in required (Vendor/Client/Admin)' : '');
    // Re-run when any context auth changes
    }, [
      adminAuth?.isAuthenticated, adminAuth?.token, adminAuth?.admin,
      vendorAuth?.user, vendorAuth?.token,
      clientAuth?.user, clientAuth?.token
    ]);

    // Initialize chat user ID only for authenticated users
    useEffect(() => {
        if (!isAuthorized) return; // Don't initialize for guests
        
        let id = localStorage.getItem('smart_chat_user_id');
        if (!id) {
            // Use actual user ID instead of generating guest ID
            id = auth.id || `user-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem('smart_chat_user_id', id);
        }
        setChatUserId(id);
        
        // Initialize with proper user context
        if (auth.role) {
            smartChatbot.initializeUserContext(id, { 
                role: auth.role,
                userId: auth.id,
                name: auth.name || auth.username 
            }).catch((error) => {
                console.log('Chat initialization skipped for authorized user:', error.message);
            });
        }
    }, [isAuthorized, auth.id, auth.role, auth.name, auth.username]);

    // Initialize chat messages based on detection result
    useEffect(() => {
        if (!isAuthorized) return; // Don't initialize chat for guests
        
        if (result) {
            // When detection result is available, initialize chat with context
            const plant = result.result?.prediction?.plant?.replace(/_/g, ' ') || 'plant';
            const disease = result.result?.prediction?.disease?.replace(/_/g, ' ') || 'condition';
            const isHealthy = result.result?.prediction?.is_healthy;
            
            let initialMessage;
            if (isHealthy) {
                initialMessage = `Great news! Your ${plant} appears to be healthy. I can help you with care tips to keep it that way. What would you like to know?`;
            } else {
                initialMessage = `I've detected ${disease} in your ${plant}. I can help you understand the condition, treatment options, and prevention measures. What specific questions do you have?`;
            }
            
            setChatMessages([
                { role: 'assistant', content: initialMessage }
            ]);
        } else {
            // Default message when no detection yet
            setChatMessages([
                { role: 'assistant', content: 'Hi! Upload a plant image for disease detection, then I can help you with specific advice about your plant\'s health and care.' }
            ]);
        }
    }, [result, isAuthorized]);

    // Fetch history when user is authenticated and history tab is activated
    useEffect(() => {
        if (activeAnalysisTab === 'history' && isAuthorized) {
            fetchDetectionHistory();
            fetchChatHistory();
        }
    }, [activeAnalysisTab, isAuthorized, chatUserId]);

    // History functions
    const fetchDetectionHistory = async () => {
        if (!isAuthorized) return;
        
        setHistoryLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/plant-disease/history`, {
                params: { limit: 20, page: 1 }
            });
            
            if (response.data.success) {
                setDetectionHistory(response.data.history || []);
            }
        } catch (error) {
            console.error('Error fetching detection history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchChatHistory = async () => {
        if (!isAuthorized || !chatUserId) return;
        
        try {
            const response = await axios.get(`${API_BASE}/chat/history`, {
                params: { userId: chatUserId, limit: 50 }
            });
            
            if (response.data.success) {
                setChatHistory(response.data.history || []);
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    const loadChatSession = async (sessionId) => {
        try {
            const response = await axios.get(`${API_BASE}/chat/session/${sessionId}`);
            
            if (response.data.success) {
                const session = response.data.session;
                setChatMessages(session.messages || []);
                setSelectedHistoryItem(session);
                setActiveAnalysisTab('chat');
            }
        } catch (error) {
            console.error('Error loading chat session:', error);
        }
    };

    const signOut = () => {
      // Clear all possible auth tokens and storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('role');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('clientToken');
      localStorage.removeItem('clientUser');
      
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('vendorToken');
      sessionStorage.removeItem('vendorUser');
      
      delete axios.defaults.headers.common['Authorization'];
      setAuth({ token: null, role: null, ready: true });
      setAuthError('Sign in required (Vendor/Client/Admin)');
    };

    // New: compact detection context builder
    const buildDetectionContext = (res) => {
        if (!res) return null;
        return {
            detectionId: res.result?.detectionId || res.metadata?.detectionId,
            sessionId: res.result?.sessionId,
            prediction: {
                plant: res.result?.prediction?.plant,
                disease: res.result?.prediction?.disease,
                is_healthy: res.result?.prediction?.is_healthy,
                confidence: res.result?.prediction?.confidence,
            },
            recommendation: res.result?.recommendation,
            disease_info: {
                severity: res.result?.disease_info?.severity,
                treatment: res.result?.disease_info?.treatment,
                prevention: res.result?.disease_info?.prevention,
            },
        };
    };

    const handleImageSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedImage(file);
            setResult(null);
            setError(null);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = async () => {
        if (!selectedImage) {
            setError('Please select an image first');
            return;
        }
        if (!isAuthorized) {
            setError('Authentication required. Please sign in as Vendor/Client/Admin.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedImage);
            
            // Add plant name if selected for improved accuracy
            if (selectedPlant) {
                formData.append('plant_name', selectedPlant);
            }

            console.log('Sending detection request with plant filter:', selectedPlant || 'auto-detect');

            const response = await axios.post(
                `${API_BASE}/plant-disease/detect`,
                formData,
                {
                    headers: {
                      'Content-Type': 'multipart/form-data',
                      'X-User-Role': auth.role || 'client',
                      'X-Session-Id': chatUserId || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
                    },
                    timeout: 30000,
                }
            );

            console.log('AI Service Response:', response.data);

            if (response.data.success) {
                setResult(response.data);
            } else {
                setError(response.data.error || 'Detection failed');
            }
        } catch (error) {
            console.error('Detection error:', error);
            if (error.response) {
                if (error.response.status === 401 || error.response.status === 403) {
                  setAuthError('Unauthorized. Please sign in with Vendor/Client/Admin access.');
                }
                setError(error.response.data?.error || 'Server error occurred');
            } else if (error.code === 'ECONNABORTED') {
                setError('Request timeout. Please try again.');
            } else {
                setError('Network error. Please check your connection.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Chat send handler -> now uses resolved role
    const handleSendChat = async () => {
        const message = chatInput.trim();
        if (!message || chatLoading) return;
        if (!isAuthorized) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: 'Please sign in to use AI Chatbot.' }]);
          return;
        }
        const uid = chatUserId || 'guest-temp';
        const next = [...chatMessages, { role: 'user', content: message }];
        setChatMessages(next);
        setChatInput('');
        setChatLoading(true);
        try {
            const resp = await smartChatbot.getChatResponse(
                uid,
                message,
                auth.role || 'client',
                { detectionContext: buildDetectionContext(result) }
            );
            const assistantReply = resp?.response || "I'm having trouble right now. Please try again.";
            setChatMessages(prev => [...prev, { role: 'assistant', content: assistantReply }]);
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network or server error. Please try again.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const resetDetection = () => {
        setSelectedImage(null);
        setImagePreview(null);
        setSelectedPlant(''); // Reset plant selection
        setResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'moderate':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'low':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return 'text-emerald-600';
        if (confidence >= 0.6) return 'text-amber-600';
        return 'text-red-600';
    };

    const getConfidenceBgColor = (confidence) => {
        if (confidence >= 0.8) return 'bg-emerald-50 border-emerald-200';
        if (confidence >= 0.6) return 'bg-amber-50 border-amber-200';
        return 'bg-red-50 border-red-200';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-100 p-4">
            <div className="max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full mb-4 shadow-lg">
                        <Leaf className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-3">
                        AI Plant Disease Detection
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Upload an image of your plant to get instant AI-powered disease diagnosis 
                        with personalized treatment recommendations
                    </p>
                    <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span>Instant Results</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-500" />
                            <span>98% Accuracy</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-500" />
                            <span>52+ Diseases</span>
                        </div>
                    </div>
                </div>

                {/* Guest Access Prevention */}
                {auth.ready && !isAuthorized && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-xl p-8 border border-yellow-200">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-800">Authentication Required</h3>
                                <p className="text-gray-600">
                                    Plant disease detection is available only for registered users. 
                                    Please sign in as a Vendor, Client, or Admin to access this feature.
                                </p>
                                <div className="pt-4">
                                    <button
                                        onClick={() => window.location.href = '/auth'}
                                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg"
                                    >
                                        Sign In to Continue
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content - Only show for authorized users */}
                {auth.ready && isAuthorized && (
                    <>
                        {/* Auth status bar */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm text-emerald-700">
                                Signed in ({auth.role.toUpperCase()})
                            </div>
                            <button
                                className="text-xs px-3 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                                onClick={() => window.location.reload()}
                                title="Refresh after login"
                            >
                                Refresh
                            </button>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-8">
                    {/* Upload Section */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                            <Upload className="w-6 h-6 text-blue-600" />
                            Upload Plant Image
                        </h2>
                        
                        {/* Plant Selection for Better Accuracy */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <label className="block text-sm font-medium text-blue-800 mb-2">
                                🎯 Select Plant Type (Optional - Improves Accuracy)
                            </label>
                            <select
                                value={selectedPlant}
                                onChange={(e) => setSelectedPlant(e.target.value)}
                                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                {PLANT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-blue-600 mt-1">
                                💡 Selecting the correct plant type helps our AI focus on relevant diseases and improves detection accuracy
                            </p>
                        </div>
                        
                        <div className={`
                            border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
                            ${(imagePreview || result?.metadata?.imageUrl)
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                            }
                        `}>
                            {(imagePreview || result?.metadata?.imageUrl) ? (
                                <div className="space-y-6">
                                    <div className="relative inline-block">
                                        <img 
                                            src={imagePreview || result?.metadata?.imageUrl} 
                                            alt="Plant image" 
                                            className="max-w-full max-h-80 mx-auto rounded-xl shadow-lg border-4 border-white"
                                        />
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex justify-center gap-4">
                                        <button
                                            onClick={handleImageUpload}
                                            disabled={isLoading || !isAuthorized}
                                            className={`
                                                px-8 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 shadow-lg
                                                ${isLoading || !isAuthorized
                                                    ? 'bg-gray-400 cursor-not-allowed' 
                                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transform hover:scale-105'
                                                } text-white
                                            `}
                                            title={!isAuthorized ? 'Sign in as Vendor/Client/Admin to run detection' : undefined}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader className="w-5 h-5 animate-spin" />
                                                    <span>Analyzing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="w-5 h-5" />
                                                    <span>Detect Disease</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={resetDetection}
                                            disabled={isLoading}
                                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                                        <Upload className="w-12 h-12 text-blue-600" />
                                    </div>
                                    <div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageSelect}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                                        >
                                            Choose Plant Image
                                        </button>
                                    </div>
                                    <div className="text-gray-500 text-sm space-y-2">
                                        <p>or drag and drop your image here</p>
                                        <p className="text-xs">Supports: JPG, PNG, WebP • Max 10MB</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Analysis (Right Column) */}
                    <div className="space-y-6">
                        {/* Tabs Header */}
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2">
                            <div className="flex items-center gap-2">
                                <button
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                                        activeAnalysisTab === 'detection'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                    onClick={() => setActiveAnalysisTab('detection')}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Detection
                                </button>
                                <button
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                                        activeAnalysisTab === 'chat'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                    onClick={() => setActiveAnalysisTab('chat')}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    AI Chatbot
                                </button>
                                <button
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                                        activeAnalysisTab === 'history'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                    onClick={() => setActiveAnalysisTab('history')}
                                    disabled={!isAuthorized}
                                    title={!isAuthorized ? 'Sign in to view history' : 'View your detection and chat history'}
                                >
                                    <Clock className="w-4 h-4" />
                                    History
                                </button>
                            </div>
                        </div>

                        {/* Detection Tab */}
                        {activeAnalysisTab === 'detection' && (
                            <>
                                {/* Error Display */}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 animate-pulse">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-semibold text-red-800 mb-1">Detection Failed</h3>
                                                <p className="text-red-700">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Loading State */}
                                {isLoading && (
                                    <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
                                        <div className="text-center space-y-4">
                                            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                                                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-800">Analyzing Your Plant</h3>
                                            <p className="text-gray-600">Our AI is examining the image for diseases...</p>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Results Display */}
                                {result && (
                                    <div className="space-y-6 animate-fadeIn">
                                        {/* Main Result Card */}
                                        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
                                            <div className="flex items-center gap-3 mb-6">
                                                {result.result?.prediction?.is_healthy ? (
                                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                                        <CheckCircle className="w-7 h-7 text-green-600" />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                                        <AlertTriangle className="w-7 h-7 text-red-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-2xl font-bold text-gray-800">Detection Results</h3>
                                                    <p className="text-gray-600">AI Analysis Complete</p>
                                                    {result.result?.warning && (
                                                        <div className="mt-2 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                                                <p className="text-sm text-yellow-800">{result.result.warning}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-gray-50 rounded-lg">
                                                        <p className="text-sm font-medium text-gray-600 mb-1">Plant Type</p>
                                                        <p className="text-lg font-bold text-gray-800 capitalize">
                                                            {result.result?.prediction.plant.replace(/_/g, ' ')}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 bg-gray-50 rounded-lg">
                                                        <p className="text-sm font-medium text-gray-600 mb-1">Health Status</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-lg font-bold capitalize ${
                                                                result.result?.prediction.is_healthy ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                                {result.result?.prediction.disease.replace(/_/g, ' ')}
                                                            </p>
                                                            {result.result?.prediction.is_healthy && <Leaf className="w-5 h-5 text-green-500" />}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className={`p-4 rounded-lg border ${getConfidenceBgColor(result.result?.prediction.confidence)}`}>
                                                        <p className="text-sm font-medium text-gray-600 mb-1">Confidence Level</p>
                                                        <div className="flex items-center gap-3">
                                                            <p className={`text-2xl font-bold ${getConfidenceColor(result.result?.prediction.confidence)}`}>
                                                                {(result.result?.prediction.confidence * 100).toFixed(1)}%
                                                            </p>
                                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                <div 
                                                                    className={`h-2 rounded-full transition-all duration-500 ${
                                                                        result.result?.prediction.confidence >= 0.8 ? 'bg-emerald-500' :
                                                                        result.result?.prediction.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                                                                    }`}
                                                                    style={{width: `${result.result?.prediction.confidence * 100}%`}}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {result.result?.disease_info.severity && (
                                                        <div className="p-4 bg-gray-50 rounded-lg">
                                                            <p className="text-sm font-medium text-gray-600 mb-1">Severity Level</p>
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                                                                getSeverityColor(result.result?.disease_info.severity)
                                                            }`}>
                                                                <TrendingUp className="w-4 h-4 mr-1" />
                                                                {result.result?.disease_info.severity}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recommendation Card */}
                                        <div className={`rounded-xl p-6 border-2 ${
                                            result.result?.prediction.is_healthy 
                                                ? 'bg-green-50 border-green-200' 
                                                : 'bg-blue-50 border-blue-200'
                                        }`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    result.result?.prediction.is_healthy ? 'bg-green-100' : 'bg-blue-100'
                                                }`}>
                                                    <Info className={`w-5 h-5 ${
                                                        result.result?.prediction.is_healthy ? 'text-green-600' : 'text-blue-600'
                                                    }`} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className={`font-bold mb-2 ${
                                                        result.result?.prediction.is_healthy ? 'text-green-800' : 'text-blue-800'
                                                    }`}>
                                                        AI Recommendation
                                                    </h4>
                                                    <p className={`leading-relaxed ${
                                                        result.result?.prediction.is_healthy ? 'text-green-700' : 'text-blue-700'
                                                    }`}>
                                                        {result.result?.recommendation}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Disease Information */}
                                        {!result.result?.prediction.is_healthy && result.result?.disease_info && (
                                            <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
                                                <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                                    <Shield className="w-6 h-6 text-purple-600" />
                                                    Treatment & Prevention
                                                </h4>
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {result.result?.disease_info.treatment && (
                                                        <div className="p-6 bg-red-50 rounded-lg border border-red-100">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                                    <Zap className="w-4 h-4 text-red-600" />
                                                                </div>
                                                                <h5 className="font-bold text-red-800">Treatment</h5>
                                                            </div>
                                                            <p className="text-red-700 leading-relaxed">{result.result?.disease_info.treatment}</p>
                                                        </div>
                                                    )}
                                                    {result.result?.disease_info.prevention && (
                                                        <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                                    <Shield className="w-4 h-4 text-blue-600" />
                                                                </div>
                                                                <h5 className="font-bold text-blue-800">Prevention</h5>
                                                            </div>
                                                            <p className="text-blue-700 leading-relaxed">{result.result?.disease_info.prevention}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Alternative Predictions */}
                                        {result.top_predictions && result.top_predictions.length > 1 && (
                                            <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
                                                <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                                                    Alternative Diagnoses
                                                </h4>
                                                <div className="space-y-3">
                                                    {result.top_predictions.slice(1).map((pred, index) => (
                                                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">
                                                                    {index + 2}
                                                                </div>
                                                                <span className="font-medium text-gray-700 capitalize">
                                                                    {pred.class.split('___').join(' - ').replace(/_/g, ' ')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                                                    <div 
                                                                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                                                        style={{width: `${pred.confidence * 100}%`}}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-600 w-12 text-right">
                                                                    {(pred.confidence * 100).toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* AI Chatbot Tab */}
                        {activeAnalysisTab === 'chat' && (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 h-[620px] flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800">Plant Assistant</h3>
                                            <p className="text-xs text-gray-500">
                                                {result
                                                    ? 'Using your latest diagnosis as context.'
                                                    : 'No diagnosis context yet. You can still ask general questions.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-3">
                                    {chatMessages.map((m, i) => (
                                        <div
                                            key={i}
                                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                                                m.role === 'assistant'
                                                    ? 'bg-white border border-gray-200 text-gray-800'
                                                    : 'ml-auto bg-indigo-600 text-white'
                                            }`}
                                        >
                                            {m.content}
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-sm">
                                            <Loader className="w-4 h-4 animate-spin text-indigo-600" />
                                            Thinking...
                                        </div>
                                    )}
                                </div>

                                {/* Quick suggestions for plant disease questions */}
                                {result && !result.result?.prediction.is_healthy && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {[
                                            "How can I treat this disease?",
                                            "What caused this condition?", 
                                            "How to prevent this in future?",
                                            "Is this disease contagious?",
                                            "When should I see results?"
                                        ].map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setChatInput(suggestion)}
                                                className="text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                                                disabled={chatLoading}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {result && result.result?.prediction.is_healthy && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {[
                                            "How to maintain plant health?",
                                            "Best care practices",
                                            "Fertilization schedule",
                                            "Watering recommendations",
                                            "Pest prevention tips"
                                        ].map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setChatInput(suggestion)}
                                                className="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors"
                                                disabled={chatLoading}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Composer */}
                                <div className="mt-4 flex items-center gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200"
                                        placeholder={
                                            result 
                                                ? result.result?.prediction.is_healthy 
                                                    ? "Ask about plant care, fertilization, watering..."
                                                    : "Ask about treatment, causes, prevention..."
                                                : "Ask about plant care, diseases, or detection..."
                                        }
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSendChat();
                                        }}
                                        disabled={chatLoading || !isAuthorized}
                                    />
                                    <button
                                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-3 disabled:bg-gray-300"
                                        onClick={handleSendChat}
                                        disabled={chatLoading || !chatInput.trim() || !isAuthorized}
                                        title={!isAuthorized ? 'Sign in to chat' : undefined}
                                    >
                                        <Send className="w-4 h-4" />
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* History Tab */}
                        {activeAnalysisTab === 'history' && (
                            <div className="space-y-6">
                                {!isAuthorized ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                                        <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                            <Clock className="w-8 h-8 text-amber-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-amber-800 mb-2">Sign In Required</h3>
                                        <p className="text-amber-700">Please sign in to view your detection and chat history.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Detection History */}
                                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                                    <Leaf className="w-5 h-5 text-green-600" />
                                                    Detection History
                                                </h3>
                                                <button
                                                    onClick={fetchDetectionHistory}
                                                    disabled={historyLoading}
                                                    className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    {historyLoading ? 'Loading...' : 'Refresh'}
                                                </button>
                                            </div>
                                            
                                            {historyLoading ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader className="w-6 h-6 animate-spin text-indigo-600" />
                                                    <span className="ml-2 text-gray-600">Loading history...</span>
                                                </div>
                                            ) : detectionHistory.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <Leaf className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                    <p>No detection history yet. Start by uploading a plant image!</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                                    {detectionHistory.map((detection, idx) => (
                                                        <div
                                                            key={detection._id}
                                                            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                                            onClick={() => {
                                                                // Convert history detection to match API response format
                                                                const formattedResult = {
                                                                    success: true,
                                                                    result: {
                                                                        detectionId: detection._id,
                                                                        sessionId: detection.sessionId,
                                                                        prediction: detection.prediction,
                                                                        disease_info: detection.disease_info,
                                                                        recommendation: detection.recommendation,
                                                                        top_predictions: detection.top_predictions
                                                                    },
                                                                    metadata: {
                                                                        detectionId: detection._id,
                                                                        imageUrl: detection.imagePath // Cloudinary URL
                                                                    }
                                                                };
                                                                setResult(formattedResult);
                                                                setActiveAnalysisTab('detection');
                                                            }}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-medium text-gray-800">
                                                                            {detection.prediction?.plant?.replace(/_/g, ' ') || 'Unknown Plant'}
                                                                        </span>
                                                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                                                            detection.prediction?.is_healthy 
                                                                                ? 'bg-green-100 text-green-700' 
                                                                                : 'bg-red-100 text-red-700'
                                                                        }`}>
                                                                            {detection.prediction?.is_healthy ? 'Healthy' : 'Disease Detected'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 mb-1">
                                                                        {detection.prediction?.disease?.replace(/_/g, ' ') || 'Unknown Condition'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {new Date(detection.timestamp).toLocaleDateString()} • 
                                                                        Confidence: {(detection.prediction?.confidence * 100).toFixed(1)}%
                                                                        {detection.plantFilter && ` • Filter: ${detection.plantFilter}`}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {detection.chatSessions?.length > 0 && (
                                                                        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                                            {detection.chatSessions.length} chat{detection.chatSessions.length > 1 ? 's' : ''}
                                                                        </div>
                                                                    )}
                                                                    <TrendingUp className="w-4 h-4 text-gray-400" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Chat History */}
                                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                                    <MessageCircle className="w-5 h-5 text-blue-600" />
                                                    Chat Sessions
                                                </h3>
                                                <button
                                                    onClick={fetchChatHistory}
                                                    className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    Refresh
                                                </button>
                                            </div>
                                            
                                            {chatHistory.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                    <p>No chat sessions yet. Start a conversation with the AI!</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                                    {chatHistory.map((session, idx) => (
                                                        <div
                                                            key={session._id}
                                                            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                                            onClick={() => loadChatSession(session.sessionId)}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-medium text-gray-800">
                                                                            Session {session.sessionId.slice(-8)}
                                                                        </span>
                                                                        {session.detectionContext?.prediction?.plant && (
                                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                                                {session.detectionContext.prediction.plant.replace(/_/g, ' ')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 mb-1">
                                                                        {session.summary?.totalMessages || 0} messages • 
                                                                        Topics: {session.summary?.topics?.slice(0, 3).join(', ') || 'General'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {new Date(session.createdAt).toLocaleDateString()} • 
                                                                        {new Date(session.createdAt).toLocaleTimeString()}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <MessageCircle className="w-4 h-4 text-gray-400" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
                    <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Powered by AI • Results in seconds</span>
                    </div>
                    <p className="text-xs text-gray-500">
                        For professional agricultural advice, consult with local farming experts
                    </p>
                </div>
                    </>
                )}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default PlantDiseaseDetector;
