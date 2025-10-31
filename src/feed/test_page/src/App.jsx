import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [posts, setPosts] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    post_title: '',
    club_name: '',
    officer_name: '',
    post_content: '',
    post_type: ''
  });

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('http://localhost:5000/');
      const data = await response.json();
      if (response.ok) {
        setPosts(data);
      } else {
        console.error('Error fetching posts:', data.error);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Post created successfully!');
        setIsMenuOpen(false);
        // Reset form
        setFormData({
          post_title: '',
          club_name: '',
          officer_name: '',
          post_content: '',
          post_type: ''
        });
        // Refresh the posts list
        fetchPosts();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (post_id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const response = await fetch('http://localhost:5000/delete_entry/' + post_id, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        alert('Post deleted successfully!');
        fetchPosts();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>TigerTunity</h1>
        <button className="new-button" onClick={() => setIsMenuOpen(true)}>
          New
        </button>
      </header>

      {/* New Post Form Modal */}
      {isMenuOpen && (
        <div className="modal-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Post</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  name="post_title"
                  value={formData.post_title}
                  onChange={handleInputChange}
                  required
                />

                <label>Club Name</label>
                <input
                  type="text"
                  name="club_name"
                  value={formData.club_name}
                  onChange={handleInputChange}
                  required
                />

                <label>Officer Name(s)</label>
                <input
                  type="text"
                  name="officer_name"
                  value={formData.officer_name}
                  onChange={handleInputChange}
                  required
                />

                <label>Post Type</label>
                <input
                  type="text"
                  name="post_type"
                  value={formData.post_type}
                  onChange={handleInputChange}
                  placeholder="e.g., Event, Announcement"
                  required
                />

                <label>Description</label>
                <textarea
                  name="post_content"
                  value={formData.post_content}
                  onChange={handleInputChange}
                  rows="5"
                  required
                />
              </div>

              <div className="button-group">
                <button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Go'}
                </button>
                <button type="button" onClick={() => setIsMenuOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Posts List */}
      <main>
        <h2>Recent Posts</h2>
        {posts.length === 0 ? (
          <p>No posts yet. Click "New" to create one!</p>
        ) : (
          <div className="posts-container">
            {posts.map((post) => (
              <div key={post.post_id} className="post-card">
                <div className="post-left">
                  <h3 className="post-title">{post.post_title}</h3>
                  <p className="club-name">{post.club_name}</p>
                  <p className="post-content">{post.post_content}</p>
                </div>

                <div className="post-right">
                  {post.officer_name && (
                    <p className="officer-name">By: {post.officer_name}</p>
                  )}
                  {post.post_type && (
                    <span className="post-type">{post.post_type}</span>
                  )}
                  {post.timestamp && (
                    <p className="timestamp">
                      {new Date(post.timestamp).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  )}
                  {/* Delete Button */}
                  <button className="delete-button"
                    onClick={() => handleDelete(post.post_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;