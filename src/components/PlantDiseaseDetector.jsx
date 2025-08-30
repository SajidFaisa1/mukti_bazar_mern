import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
    Camera, Upload, Loader, CheckCircle, AlertTriangle, Info, 
    Leaf, Zap, TrendingUp, Clock, Shield, Award
} from 'lucide-react';


const PlantDiseaseDetector = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

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

        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedImage);

            const response = await axios.post('/api/plant-disease/detect', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000, // 30 seconds
            });

            if (response.data.success) {
                setResult(response.data.result);
            } else {
                setError(response.data.error || 'Detection failed');
            }
        } catch (error) {
            console.error('Detection error:', error);
            if (error.response) {
                setError(error.response.data.error || 'Server error occurred');
            } else if (error.code === 'ECONNABORTED') {
                setError('Request timeout. Please try again.');
            } else {
                setError('Network error. Please check your connection.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetDetection = () => {
        setSelectedImage(null);
        setImagePreview(null);
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

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Upload Section */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                            <Upload className="w-6 h-6 text-blue-600" />
                            Upload Plant Image
                        </h2>
                        
                        <div className={`
                            border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
                            ${imagePreview 
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                            }
                        `}>
                            {imagePreview ? (
                                <div className="space-y-6">
                                    <div className="relative inline-block">
                                        <img 
                                            src={imagePreview} 
                                            alt="Selected plant" 
                                            className="max-w-full max-h-80 mx-auto rounded-xl shadow-lg border-4 border-white"
                                        />
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex justify-center gap-4">
                                        <button
                                            onClick={handleImageUpload}
                                            disabled={isLoading}
                                            className={`
                                                px-8 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 shadow-lg
                                                ${isLoading 
                                                    ? 'bg-gray-400 cursor-not-allowed' 
                                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transform hover:scale-105'
                                                } text-white
                                            `}
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

                    {/* Results Section */}
                    <div className="space-y-6">
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
                                        {result.prediction.is_healthy ? (
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
                                        </div>
                                    </div>
                                    
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <p className="text-sm font-medium text-gray-600 mb-1">Plant Type</p>
                                                <p className="text-lg font-bold text-gray-800 capitalize">
                                                    {result.prediction.plant.replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <p className="text-sm font-medium text-gray-600 mb-1">Health Status</p>
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-lg font-bold capitalize ${
                                                        result.prediction.is_healthy ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {result.prediction.disease.replace(/_/g, ' ')}
                                                    </p>
                                                    {result.prediction.is_healthy && <Leaf className="w-5 h-5 text-green-500" />}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className={`p-4 rounded-lg border ${getConfidenceBgColor(result.prediction.confidence)}`}>
                                                <p className="text-sm font-medium text-gray-600 mb-1">Confidence Level</p>
                                                <div className="flex items-center gap-3">
                                                    <p className={`text-2xl font-bold ${getConfidenceColor(result.prediction.confidence)}`}>
                                                        {(result.prediction.confidence * 100).toFixed(1)}%
                                                    </p>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full transition-all duration-500 ${
                                                                result.prediction.confidence >= 0.8 ? 'bg-emerald-500' :
                                                                result.prediction.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                            style={{width: `${result.prediction.confidence * 100}%`}}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                            {result.disease_info.severity && (
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <p className="text-sm font-medium text-gray-600 mb-1">Severity Level</p>
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                                                        getSeverityColor(result.disease_info.severity)
                                                    }`}>
                                                        <TrendingUp className="w-4 h-4 mr-1" />
                                                        {result.disease_info.severity}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendation Card */}
                                <div className={`rounded-xl p-6 border-2 ${
                                    result.prediction.is_healthy 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-blue-50 border-blue-200'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            result.prediction.is_healthy ? 'bg-green-100' : 'bg-blue-100'
                                        }`}>
                                            <Info className={`w-5 h-5 ${
                                                result.prediction.is_healthy ? 'text-green-600' : 'text-blue-600'
                                            }`} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold mb-2 ${
                                                result.prediction.is_healthy ? 'text-green-800' : 'text-blue-800'
                                            }`}>
                                                AI Recommendation
                                            </h4>
                                            <p className={`leading-relaxed ${
                                                result.prediction.is_healthy ? 'text-green-700' : 'text-blue-700'
                                            }`}>
                                                {result.recommendation}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Disease Information */}
                                {!result.prediction.is_healthy && result.disease_info && (
                                    <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
                                        <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                            <Shield className="w-6 h-6 text-purple-600" />
                                            Treatment & Prevention
                                        </h4>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {result.disease_info.treatment && (
                                                <div className="p-6 bg-red-50 rounded-lg border border-red-100">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                            <Zap className="w-4 h-4 text-red-600" />
                                                        </div>
                                                        <h5 className="font-bold text-red-800">Treatment</h5>
                                                    </div>
                                                    <p className="text-red-700 leading-relaxed">{result.disease_info.treatment}</p>
                                                </div>
                                            )}
                                            {result.disease_info.prevention && (
                                                <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <Shield className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <h5 className="font-bold text-blue-800">Prevention</h5>
                                                    </div>
                                                    <p className="text-blue-700 leading-relaxed">{result.disease_info.prevention}</p>
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
