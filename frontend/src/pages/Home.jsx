import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { 
  FaFileInvoice, 
  FaMoneyBillWave, 
  FaShoppingCart, 
  FaChartLine, 
  FaShieldAlt, 
  FaClock,
  FaCheckCircle,
  FaRocket,
  FaUsers,
  FaGlobe,
  FaArrowRight,
  FaPlayCircle,
  FaStar,
  FaQuoteLeft
} from 'react-icons/fa';
import { MdSecurity, MdSpeed, MdTrendingUp } from 'react-icons/md';
import { BsLightningChargeFill } from 'react-icons/bs';
import './Home.css';

const Home = () => {
  const { account, contracts } = useWeb3();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalFunded: '0',
    activeInvoices: 0,
    averageDiscount: '8%'
  });
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    // In production, fetch real stats from backend
    setStats({
      totalInvoices: 156,
      totalFunded: '2.5M',
      activeInvoices: 48,
      averageDiscount: '8.7%'
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    {
      name: 'Rajesh Kumar',
      role: 'CEO, TechFab Industries',
      content: 'DeSupply transformed our cash flow management. We get paid within 24 hours instead of waiting 60-90 days.',
      rating: 5
    },
    {
      name: 'Priya Sharma',
      role: 'CFO, Global Textiles',
      content: 'The verification process is seamless and the platform is incredibly secure. Best invoice financing solution we\'ve used.',
      rating: 5
    },
    {
      name: 'Amit Patel',
      role: 'Fund Manager, Yield Capital',
      content: 'As a lender, I love the transparency and automated settlements. The returns are predictable and the risk is minimal.',
      rating: 5
    }
  ];

  return (
    <div className="home">
      {/* Hero Section with Gradient Background */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="hero-pattern"></div>
        </div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <BsLightningChargeFill /> Powered by Blockchain
            </div>
            <h1 className="hero-title">
              Transform Your <span className="gradient-text">Invoices</span> into
              <br />Instant <span className="gradient-text">Liquidity</span>
            </h1>
            <p className="hero-description">
              India's first blockchain-powered invoice financing platform for MSMEs.
              Get paid in 24 hours instead of 90 days with our verified NFT-based system.
            </p>
            
            <div className="hero-actions">
              {!account ? (
                <button className="btn btn-primary btn-large pulse-animation">
                  <FaRocket /> Connect Wallet to Start
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/supplier')}
                  className="btn btn-primary btn-large"
                >
                  <FaRocket /> Launch Dashboard
                </button>
              )}
              <button className="btn btn-secondary btn-large">
                <FaPlayCircle /> Watch Demo
              </button>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-value">24hrs</span>
                <span className="stat-label">Average Payment Time</span>
              </div>
              <div className="hero-stat">
                <span className="stat-value">100%</span>
                <span className="stat-label">Verified Invoices</span>
              </div>
              <div className="hero-stat">
                <span className="stat-value">₹2.5M+</span>
                <span className="stat-label">Total Funded</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card glass-effect">
              <div className="stat-icon-wrapper">
                <FaFileInvoice className="stat-icon" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number counter">{stats.totalInvoices}</h3>
                <p className="stat-label">Verified Invoices</p>
              </div>
              <div className="stat-trend positive">+12% this month</div>
            </div>
            
            <div className="stat-card glass-effect">
              <div className="stat-icon-wrapper">
                <FaMoneyBillWave className="stat-icon" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">₹{stats.totalFunded}</h3>
                <p className="stat-label">Total Funded</p>
              </div>
              <div className="stat-trend positive">+25% growth</div>
            </div>
            
            <div className="stat-card glass-effect">
              <div className="stat-icon-wrapper">
                <FaChartLine className="stat-icon" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">{stats.activeInvoices}</h3>
                <p className="stat-label">Active Deals</p>
              </div>
              <div className="stat-trend">Live now</div>
            </div>
            
            <div className="stat-card glass-effect">
              <div className="stat-icon-wrapper">
                <MdTrendingUp className="stat-icon" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">{stats.averageDiscount}</h3>
                <p className="stat-label">Avg. Returns</p>
              </div>
              <div className="stat-trend positive">Guaranteed</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="process-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Simple Process</span>
            <h2 className="section-title">How DeSupply Works</h2>
            <p className="section-description">
              Get funded in 4 simple steps with our streamlined blockchain process
            </p>
          </div>
          
          <div className="process-timeline">
            <div className="process-line"></div>
            
            <div className="process-step" data-step="1">
              <div className="step-icon-wrapper">
                <FaFileInvoice className="step-icon" />
                <span className="step-number">01</span>
              </div>
              <div className="step-content">
                <h3>Upload Invoice</h3>
                <p>Submit your invoice with PO and delivery proof for instant verification</p>
                <span className="step-time">~2 minutes</span>
              </div>
            </div>
            
            <div className="process-step" data-step="2">
              <div className="step-icon-wrapper">
                <FaShieldAlt className="step-icon" />
                <span className="step-number">02</span>
              </div>
              <div className="step-content">
                <h3>Smart Verification</h3>
                <p>AI-powered multi-layer verification through GST, ERP & logistics APIs</p>
                <span className="step-time">~5 minutes</span>
              </div>
            </div>
            
            <div className="process-step" data-step="3">
              <div className="step-icon-wrapper">
                <BsLightningChargeFill className="step-icon" />
                <span className="step-number">03</span>
              </div>
              <div className="step-content">
                <h3>Instant Funding</h3>
                <p>Lenders compete to fund your verified invoice at best rates</p>
                <span className="step-time">~24 hours</span>
              </div>
            </div>
            
            <div className="process-step" data-step="4">
              <div className="step-icon-wrapper">
                <FaCheckCircle className="step-icon" />
                <span className="step-number">04</span>
              </div>
              <div className="step-content">
                <h3>Auto Settlement</h3>
                <p>Smart contracts automatically handle repayment on due date</p>
                <span className="step-time">On maturity</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="roles-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Get Started</span>
            <h2 className="section-title">Choose Your Role</h2>
            <p className="section-description">
              Join DeSupply ecosystem and unlock the power of blockchain-based invoice financing
            </p>
          </div>
          
          <div className="roles-grid">
            <Link to="/supplier" className="role-card hover-lift">
              <div className="role-icon-wrapper supplier">
                <FaFileInvoice className="role-icon" />
              </div>
              <h3>I'm a Supplier</h3>
              <p>Get instant cash flow by converting your invoices into tradeable NFTs</p>
              <ul className="role-benefits">
                <li><FaCheckCircle /> Get paid in 24 hours</li>
                <li><FaCheckCircle /> Better rates than banks</li>
                <li><FaCheckCircle /> No collateral needed</li>
              </ul>
              <span className="role-cta">
                Start Earning <FaArrowRight />
              </span>
            </Link>
            
            <Link to="/lender" className="role-card hover-lift featured">
              <div className="featured-badge">Most Popular</div>
              <div className="role-icon-wrapper lender">
                <FaMoneyBillWave className="role-icon" />
              </div>
              <h3>I'm a Lender</h3>
              <p>Earn predictable returns by funding verified invoices</p>
              <ul className="role-benefits">
                <li><FaCheckCircle /> 8-12% annual returns</li>
                <li><FaCheckCircle /> Short-term investments</li>
                <li><FaCheckCircle /> Asset-backed security</li>
              </ul>
              <span className="role-cta">
                Browse Opportunities <FaArrowRight />
              </span>
            </Link>
            
            <Link to="/buyer" className="role-card hover-lift">
              <div className="role-icon-wrapper buyer">
                <FaShoppingCart className="role-icon" />
              </div>
              <h3>I'm a Buyer</h3>
              <p>Optimize working capital and strengthen supplier relationships</p>
              <ul className="role-benefits">
                <li><FaCheckCircle /> Dynamic discounting</li>
                <li><FaCheckCircle /> Supply chain stability</li>
                <li><FaCheckCircle /> Automated reconciliation</li>
              </ul>
              <span className="role-cta">
                Manage Payables <FaArrowRight />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Why Choose Us</span>
            <h2 className="section-title">Built for Modern Business</h2>
            <p className="section-description">
              Experience the future of invoice financing with our cutting-edge blockchain platform
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box">
                <MdSpeed />
              </div>
              <h3>Lightning Fast</h3>
              <p>Get funded in 24 hours instead of waiting 60-90 days for payment</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-box">
                <MdSecurity />
              </div>
              <h3>Bank-Grade Security</h3>
              <p>Multi-layer verification and blockchain immutability ensure complete security</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-box">
                <FaGlobe />
              </div>
              <h3>Global Network</h3>
              <p>Access to a wide network of verified lenders and competitive rates</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-box">
                <FaUsers />
              </div>
              <h3>Trusted by 500+ MSMEs</h3>
              <p>Join hundreds of businesses already transforming their cash flow</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Success Stories</span>
            <h2 className="section-title">What Our Clients Say</h2>
          </div>
          
          <div className="testimonials-wrapper">
            <div className="testimonials-container">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className={`testimonial-card ${index === activeTestimonial ? 'active' : ''}`}
                >
                  <div className="quote-icon">
                    <FaQuoteLeft />
                  </div>
                  <p className="testimonial-content">{testimonial.content}</p>
                  <div className="testimonial-rating">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FaStar key={i} className="star-icon" />
                    ))}
                  </div>
                  <div className="testimonial-author">
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="testimonial-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Cash Flow?</h2>
            <p>Join 500+ businesses already using DeSupply for instant invoice financing</p>
            <div className="cta-actions">
              <button className="btn btn-primary btn-large">
                <FaRocket /> Get Started Now
              </button>
              <button className="btn btn-outline btn-large">
                <FaPlayCircle /> Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
