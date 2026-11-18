import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';

export default function GoogleSignInButton() {
  const buttonRef = useRef(null);
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;
    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setError('');
          try {
            await googleLogin(credential);
            navigate('/account', { replace: true });
          } catch (requestError) {
            setError(requestError.message);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: 360,
      });
    };

    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT}"]`);
    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton);
    } else {
      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      script.onerror = () => setError('Google sign-in could not load. Please try again later.');
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      existingScript?.removeEventListener('load', renderGoogleButton);
    };
  }, [clientId, googleLogin, navigate]);

  if (!clientId) return <p className="google-unavailable">Google sign-in will be available after configuration.</p>;
  return <div className="google-signin-wrap"><div className="google-signin" ref={buttonRef} />{error && <p className="auth-error" role="alert">{error}</p>}</div>;
}
