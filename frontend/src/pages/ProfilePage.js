import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './ProfilePage.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosInstance';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const BASE_URL = 'http://localhost:8000'; 

const avatars = [
  { id: 1, src: '/images/avatar1.png', alt: 'Avatar 1' },
  { id: 2, src: '/images/avatar2.png', alt: 'Avatar 2' },
  { id: 3, src: '/images/avatar3.png', alt: 'Avatar 3' },
  { id: 4, src: '/images/avatar4.png', alt: 'Avatar 4' },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    avatarUrl: '/images/avatar1.png',
    memberSince: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAvatars, setShowAvatars] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    username: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0); 
  const isFetchingRef = useRef(false);

  const toastConfig = useMemo(() => ({
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "light",
  }), []);

  const fetchProfile = useCallback(async () => {
    if (isFetchingRef.current === true) return;
    isFetchingRef.current = true;
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        navigate('/');
        return;
      }
      const response = await fetch(`${API_URL}/users/auth-status/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 401) {
        toast.error('Session expired. Please log in again.', toastConfig);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/signin-signup');
        return;
      }
      const data = await response.json();
      console.log("Auth status response:", data);
      if (response.ok) {
        const memberSince = new Date(data.date_joined).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const timestamp = Date.now();
        
        // check if avatar_url is in the response
        let avatarUrl;
        if (data.avatar_url && data.avatar_url !== '') {
          avatarUrl = data.avatar_url.startsWith('http') 
            ? `${data.avatar_url}?t=${timestamp}` 
            : `${BASE_URL}${data.avatar_url}?t=${timestamp}`;
          console.log("Using avatar from auth response:", avatarUrl);
        } else {
          // Check if we have a stored avatar URL
          const storedAvatarUrl = localStorage.getItem('userAvatarUrl');
          if (storedAvatarUrl) {
            avatarUrl = storedAvatarUrl.startsWith('http')
              ? `${storedAvatarUrl}?t=${timestamp}`
              : `${BASE_URL}${storedAvatarUrl}?t=${timestamp}`;
            console.log("Using stored avatar:", avatarUrl);
          } else {
            // Fallback to default avatar
            avatarUrl = `/images/avatar1.png?t=${timestamp}`;
            console.log("Using default avatar:", avatarUrl);
          }
        }
        
        setProfile({ username: data.username, email: data.email, avatarUrl, memberSince });
        setEditProfileData({ username: data.username, email: data.email });
      } else {
        setError('Failed to fetch profile');
        toast.error('Failed to fetch profile', toastConfig);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      setError('Error fetching profile');
      toast.error('Error fetching profile', toastConfig);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [navigate, toastConfig]);
  
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [fetchProfile, fetchTrigger]); 

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const handleSelectAvatar = async (avatar) => {
    try {
      const formData = new FormData();
      const response = await fetch(avatar.src);
      const blob = await response.blob();
      const file = new File([blob], avatar.alt + '.png', { type: 'image/png' });
      formData.append('avatar', file);
  
      const accessToken = localStorage.getItem('accessToken');
      const uploadResponse = await fetch(`${API_URL}/upload-avatar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });
  
      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        console.log("Avatar upload response:", data);
        
        if (data.avatarUrl) {
          // Store the avatar URL in local storage 
          localStorage.setItem('userAvatarUrl', data.avatarUrl);
          
          const timestamp = Date.now();
          const fullAvatarUrl = data.avatarUrl.startsWith('http') 
            ? `${data.avatarUrl}?t=${timestamp}` 
            : `${BASE_URL}${data.avatarUrl}?t=${timestamp}`;
          
          setProfile(prev => ({ ...prev, avatarUrl: fullAvatarUrl }));
        }
        
        setFetchTrigger(prevTrigger => prevTrigger + 1);
        setShowAvatars(false);
        toast.success('Avatar updated successfully!', toastConfig);
      } else {
        console.error("Upload failed with status:", uploadResponse.status);
        toast.error('Failed to update avatar', toastConfig);
      }
    } catch (error) {
      console.error("Avatar selection error:", error);
      toast.error('Error updating avatar', toastConfig);
    }
  };

  const toggleAvatarSelection = () => {
    setShowAvatars(!showAvatars);
  };

  // File upload for custom profile picture
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('avatar', file);
  
      try {
        const response = await fetch(`${API_URL}/upload-avatar/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        });
  
        if (response.ok) {
          const data = await response.json();
          console.log("File upload response:", data);
          
          if (data.avatarUrl) {
            // Store the avatar URL in local storage
            localStorage.setItem('userAvatarUrl', data.avatarUrl);
            
            // Update the profile state directly
            const timestamp = Date.now();
            const fullAvatarUrl = data.avatarUrl.startsWith('http')
              ? `${data.avatarUrl}?t=${timestamp}`
              : `${BASE_URL}${data.avatarUrl}?t=${timestamp}`;
            
            setProfile(prev => ({ ...prev, avatarUrl: fullAvatarUrl }));
          }
          
          setFetchTrigger(prevTrigger => prevTrigger + 1);
          toast.success('Profile picture uploaded successfully!', toastConfig);
        } else {
          toast.error('Failed to upload profile picture', toastConfig);
        }
      } catch (error) {
        console.error("File upload error:", error);
        toast.error('Error uploading profile picture', toastConfig);
      }
    }
  };

  // Edit Profile Modal
  const openEditModal = () => {
    setEditProfileData({
      username: profile.username,
      email: profile.email,
    });
    setEditModalOpen(true);
  };

  const handleEditProfileChange = (e) => {
    const { name, value } = e.target;
    console.log("Editing field:", name, "New value:", value);
    setEditProfileData(prevData => ({ ...prevData, [name]: value }));
  };

  const saveProfileChanges = async () => {
    try {
      const response = await fetch(`${API_URL}/update-profile/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(editProfileData),
      });

      if (response.ok) {
        setProfile(prev => ({ ...prev, ...editProfileData }));
        setEditModalOpen(false);
        toast.success('Profile updated successfully!', toastConfig);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update profile', toastConfig);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error('Error updating profile', toastConfig);
    }
  };

  // Change Password
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prevData => ({ ...prevData, [name]: value }));
  };

  const savePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('New passwords do not match', toastConfig);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setChangePasswordModalOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        toast.success('Password changed successfully!', toastConfig);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to change password', toastConfig);
      }
    } catch (error) {
      console.error("Password change error:", error);
      toast.error('Error changing password', toastConfig);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await axiosInstance.post('/users/logout/', { refresh: refreshToken });
  
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      toast.success('Logged out successfully!', toastConfig);
      navigate('/');
    } catch (error) {
      console.error("Error logging out:", error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!deleteConfirmation) {
      setDeleteConfirmation(true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/delete-account/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-CSRFToken': getCookie('csrftoken'),
        },
      });

      if (response.ok) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        toast.success('Account deleted successfully!', toastConfig);
        navigate('/signin-signup');
      } else {
        toast.error('Failed to delete account', toastConfig);
      }
    } catch (error) {
      console.error("Account deletion error:", error);
      toast.error('Error deleting account', toastConfig);
    } finally {
      setDeleteConfirmation(false);
    }
  };

  // Helper function to get CSRF token
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  return (
    <div className="profile-container">
      {/* Sidebar */}
      <div className="profile-sidebar">
        <div className="profile-picture-section">
        <div className="profile-picture">
  <img 
    src={profile.avatarUrl} 
    alt="Profile" 
    key={profile.avatarUrl}
    onError={(e) => {
      console.log("Image failed to load:", e.target.src);
      e.target.onerror = null; // Prevent infinite loop
      e.target.src = "/images/avatar1.png";
    }}
  />
  <input
    type="file"
    id="profile-picture-upload"
    style={{ display: 'none' }}
    accept="image/*"
    onChange={handleFileUpload}
  />
  <label htmlFor="profile-picture-upload" className="profile-picture-edit">
    <span className="camera-icon" role="img" aria-label="Camera">📷</span>
  </label>
</div>

          <button className="change-picture-btn" onClick={toggleAvatarSelection}>
            Select Avatar
          </button>

          {showAvatars && (
            <div className="avatar-selection">
              <p className="select-avatar-text">Select Avatar</p>
              <div className="avatar-options">
                {avatars.map((avatar) => (
                  <div
                    key={avatar.id}
                    className="avatar-option"
                    onClick={() => handleSelectAvatar(avatar)}
                  >
                    <img src={avatar.src} alt={avatar.alt} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="account-status">
          <h3>Account Status</h3>
          <div className="status-item">
            <div className="status-icon active-icon">
              <span role="img" aria-label="Checkmark">✓</span>
            </div>
            <p>Active Member</p>
          </div>
          <div className="status-item">
            <div className="status-icon active-icon">
              <span role="img" aria-label="Checkmark">✓</span>
            </div>
            <p>Member since {profile.memberSince}</p>
          </div>
          <div className="status-item">
            <div className="status-icon clock-icon">
              <span role="img" aria-label="Clock">🕒</span>
            </div>
            <p>Last active: Today</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-main">
        <div className="profile-header">
          <h1>Hello, {profile.username}!</h1>
          <button className="edit-icon-btn" onClick={openEditModal}>
            <span className="edit-icon" role="img" aria-label="Edit">✏️</span>
          </button>
        </div>

        <div className="profile-info-grid">
          <div className="info-item">
            <label>Email Address</label>
            <div className="info-value">
              <span className="email-icon" role="img" aria-label="Email">✉️</span>
              <span>{profile.email}</span>
            </div>
          </div>
        </div>

        <button className="edit-profile-btn" onClick={openEditModal}>
          <span className="edit-icon" role="img" aria-label="Edit">✏️</span>
          Edit Profile Information
        </button>

        <div className="security-section">
          <div className="security-header">
            <span className="lock-icon" role="img" aria-label="Lock">🔒</span>
            <h2>Password & Security</h2>
          </div>

          <button
            className="change-password-btn"
            onClick={() => setChangePasswordModalOpen(true)}
          >
            <span className="refresh-icon" role="img" aria-label="Refresh">🔄</span>
            Change Password
          </button>
        </div>

        <div className="account-actions">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="logout-icon" role="img" aria-label="Logout">↪️</span>
            Logout
          </button>

          <button className="delete-account-btn" onClick={handleDeleteAccount}>
            <span className="delete-icon" role="img" aria-label="Delete">🗑️</span>
            {deleteConfirmation ? 'Confirm Delete' : 'Delete Account'}
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Profile</h2>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={editProfileData.username}
                onChange={handleEditProfileChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={editProfileData.email}
                onChange={handleEditProfileChange}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button onClick={saveProfileChanges}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changePasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Change Password</h2>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmNewPassword"
                name="confirmNewPassword"
                value={passwordData.confirmNewPassword}
                onChange={handlePasswordChange}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setChangePasswordModalOpen(false)}>Cancel</button>
              <button onClick={savePasswordChange}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;