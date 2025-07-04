import { useNavigate } from 'react-router-dom';

export const AuthRedirect = ({ children }) => {
  const navigate = useNavigate();
  return children({ navigate });
};
