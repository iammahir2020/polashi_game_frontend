import React from 'react';
import '../../style/login.css';
import { signInWithGoogle } from '../../auth/googleAuth';
import { useFirebaseAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// SVG Icons for Google and Facebook
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LoginForm: React.FC = () => {
  // const [isLogin, setIsLogin] = useState<boolean>(true);
  const { user, loading } = useFirebaseAuth();
  const navigate = useNavigate();
  const { login } = useAuth();
  

  if (loading) return null;

  // Single state object for form data
  //   const [formData, setFormData] = useState({
  //     name: '',
  //     email: '',
  //     password: ''
  //   });

  //   const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  //     const { name, value } = e.target;
  //     setFormData(prev => ({
  //       ...prev,
  //       [name]: value
  //     }));
  //   };

  //   const handleSubmit = (e: FormEvent) => {
  //     e.preventDefault();
  //     if (isLogin) {
  //       console.log('Logging in with:', formData.email, formData.password);
  //       // Add your login logic here
  //     } else {
  //       console.log('Signing up with:', formData);
  //       // Add your signup logic here
  //     }
  //   };

  if (user) {
    login();
    navigate('/dashboard');
  }

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    if (provider === 'google') {
      signInWithGoogle()
    } else if (provider === 'facebook') {
      console.log('Facebook login clicked');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* <div className="auth-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Please enter your details' : 'Get started with your free account'}</p>
        </div> */}
        <div className="auth-header">
          <h2>{'Create Account'}</h2>
          <p>{'Get started with your free account'}</p>
        </div>

        {/* <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                className="form-input"
                type="text"
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              className="form-input"
              type="email"
              id="email"
              name="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              className="form-input"
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form> */}

        {/* <div className="divider">
          <span>Or continue with</span>
        </div> */}

        <div className="social-buttons">
          <button
            type="button"
            className="btn btn-social"
            onClick={() => handleSocialLogin('google')}
          >
            <GoogleIcon />
            Google
          </button>

          <button
            type="button"
            className="btn btn-social"
            onClick={() => handleSocialLogin('facebook')}
          >
            <FacebookIcon />
            Facebook
          </button>
        </div>

        {/* <div className="toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            className="toggle-link"
            onClick={() => {
              setIsLogin(!isLogin);
              // setFormData({ name: '', email: '', password: '' }); // Clear form on toggle
            }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default LoginForm;