import { useState, useEffect } from 'react';
import { User, Phone, Mail, Link as LinkIcon, Briefcase, Award, Upload, Save, BadgeCheck, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getProfile, updateProfile, uploadProfilePicture } from '../api/profile';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const login = useAuthStore((s) => s.login);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    phone: '',
    bio: '',
    linkedin_url: '',
    experience_years: 0,
    skills: [],
  });

  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    getProfile()
      .then((res) => {
        setProfile({
          username: res.data.username || '',
          full_name: res.data.full_name || '',
          phone: res.data.phone || '',
          bio: res.data.bio || '',
          linkedin_url: res.data.linkedin_url || '',
          experience_years: res.data.experience_years || 0,
          skills: res.data.skills || [],
        });
      })
      .catch((err) => {
        toast.error('Failed to load profile details');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !profile.skills.includes(clean)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, clean],
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await updateProfile(profile);
      if (data.access_token) {
        login(data.access_token, {
          id: data.id,
          username: data.username,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          profile_picture: data.profile_picture,
        });
      } else {
        setUser({
          ...user,
          username: data.username,
          full_name: data.full_name,
          role: data.role,
          profile_picture: data.profile_picture,
        });
      }
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const { data } = await uploadProfilePicture(formData);
      setUser({
        ...user,
        profile_picture: data.profile_picture,
      });
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'recruiter': return 'bg-action-blue/10 text-action-blue border-action-blue/20';
      case 'hr': return 'bg-coral/10 text-coral border-coral/20';
      default: return 'bg-deep-green/10 text-deep-green border-deep-green/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const avatarUrl = user?.profile_picture
    ? `http://localhost:8000${user.profile_picture}`
    : null;

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="mono-label mb-2">My Account</p>
          <h1 className="font-display text-section-heading text-primary">Profile Settings</h1>
        </div>
        <div className={`px-4 py-1.5 rounded-full border text-sm font-semibold capitalize flex items-center gap-2 ${getRoleColor(user?.role)}`}>
          {user?.role === 'candidate' ? <BadgeCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          {user?.role} Account
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Card: Avatar & Quick Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card text-center p-6 flex flex-col items-center">
            <div className="relative group w-32 h-32 mb-4 rounded-full overflow-hidden border-2 border-primary/20 bg-background/50 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-muted" />
              )}
              <label className="absolute inset-0 bg-primary-dark/80 flex flex-col items-center justify-center gap-1 text-on-dark opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-caption font-medium">
                <Upload className="w-5 h-5" />
                <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={handlePictureUpload} className="hidden" disabled={uploading} />
              </label>
            </div>

            <h3 className="font-display text-card-heading text-primary font-semibold">{profile.full_name}</h3>
            <p className="text-caption text-primary font-medium mt-0.5">@{profile.username}</p>
            <p className="text-caption text-muted mb-4">{user?.email}</p>
            <p className="text-body text-center text-muted italic text-sm">
              &ldquo;{profile.bio || 'Add a bio to introduce yourself...'}&rdquo;
            </p>
          </div>
        </div>

        {/* Right Card: Full Profile Edit Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSave} className="glass-card p-8 space-y-6">
            <h3 className="font-display text-card-heading text-primary border-b border-primary/10 pb-3 mb-4">
              Personal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label" htmlFor="prof-username">Username</label>
                <input id="prof-username" name="username" className="input-field" value={profile.username} onChange={handleChange} required />
              </div>
              <div>
                <label className="label" htmlFor="prof-name">Full Name</label>
                <input id="prof-name" name="full_name" className="input-field" value={profile.full_name} onChange={handleChange} required />
              </div>
              <div>
                <label className="label" htmlFor="prof-phone">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Phone className="w-4 h-4" /></span>
                  <input id="prof-phone" name="phone" className="input-field pl-10" placeholder="+91 9876543210" value={profile.phone} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="prof-linkedin">LinkedIn URL</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><LinkIcon className="w-4 h-4" /></span>
                <input id="prof-linkedin" name="linkedin_url" className="input-field pl-10" placeholder="https://linkedin.com/in/username" value={profile.linkedin_url} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="prof-bio">Short Bio</label>
              <textarea id="prof-bio" name="bio" rows={3} className="input-field resize-none py-3" placeholder="Tell us about yourself..." value={profile.bio} onChange={handleChange} />
            </div>

            <h3 className="font-display text-card-heading text-primary border-b border-primary/10 pb-3 pt-4 mb-4">
              Professional Details
            </h3>

            <div>
              <label className="label" htmlFor="prof-exp">Years of Experience</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Briefcase className="w-4 h-4" /></span>
                <input id="prof-exp" name="experience_years" type="number" min={0} className="input-field pl-10" value={profile.experience_years} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="prof-skills">Skills & Expertise</label>
              <div className="flex gap-2 mb-3">
                <input id="prof-skills" className="input-field" placeholder="e.g. React, Python, Product Management" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} />
                <button type="button" onClick={handleAddSkill} className="btn-secondary px-6">Add</button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-sm border border-primary/10 bg-background/50">
                {profile.skills.length === 0 ? (
                  <span className="text-caption text-muted self-center">No skills added yet</span>
                ) : (
                  profile.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-caption flex items-center gap-1.5 font-medium animate-scale-in">
                      {skill}
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className="text-muted hover:text-coral transition-colors font-bold text-xs">×</button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary px-8">
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
