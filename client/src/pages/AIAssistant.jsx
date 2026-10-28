import { useState } from 'react';
import { Sparkles, Bot, Send, Lightbulb, TrendingUp, ShieldCheck, Copy, Check } from 'lucide-react';
import './AIAssistant.css';

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [response, setResponse] = useState(null);

  const samplePrompts = [
    'Suggest starting bid & description for my 2-year old Hercules cycle with minor chain squeak',
    'Write a listing for Casio fx-991EX calculator with formula booklet included',
    'What is a fair campus price for Dell 24-inch 1080p monitor used for 3 semesters?'
  ];

  const handleGenerate = (queryText) => {
    const q = queryText || prompt;
    if (!q.trim()) return;

    setLoading(true);
    setResponse(null);

    // Mock intelligent generation for preview
    setTimeout(() => {
      if (q.toLowerCase().includes('cycle') || q.toLowerCase().includes('bicycle')) {
        setResponse({
          title: 'Firefox / Hercules 26T Campus Commuter',
          suggestedStartingPrice: '₹2,400',
          suggestedIncrement: '₹150',
          estimatedFairValue: '₹3,200 - ₹3,600',
          generatedDescription: `Reliable daily campus bicycle ideal for traveling between hostel clusters and lecture halls. Includes recently adjusted Shimano brakes, functional bell, and combination cable lock. Minor chain squeak serviced with fresh silicone lubricant. Tires maintain solid pressure. Handover at Hostel parking stands.`,
          campusTip: 'Bicycles sell quickest on Sunday evenings before the academic week starts!'
        });
      } else if (q.toLowerCase().includes('calc') || q.toLowerCase().includes('casio')) {
        setResponse({
          title: 'Casio fx-991EX Scientific Classwiz Calculator',
          suggestedStartingPrice: '₹750',
          suggestedIncrement: '₹50',
          estimatedFairValue: '₹1,000 - ₹1,200',
          generatedDescription: `Essential engineering scientific calculator with 552 functions, matrix calculations, and spreadsheet display. Clean LCD screen with zero pixel lines. Includes protective sliding cover and original formula reference quick-guide. Dual solar-battery powered.`,
          campusTip: 'Engineering math midterms are in 3 weeks; demand for this model is peak!'
        });
      } else {
        setResponse({
          title: 'Student Electronics / Study Essential',
          suggestedStartingPrice: '₹3,500',
          suggestedIncrement: '₹200',
          estimatedFairValue: '₹4,500 - ₹5,200',
          generatedDescription: `Well-cared-for student tech equipment in solid functional condition. Used in dorm room desk setup. All ports, switches, and included power accessories inspected and cleaned. Ready for instant campus handover.`,
          campusTip: 'Set minimum bid increments to at least 5% of starting price to encourage competitive bidding.'
        });
      }
      setLoading(false);
    }, 600);
  };

  const handleCopy = () => {
    if (response?.generatedDescription) {
      navigator.clipboard.writeText(response.generatedDescription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="ai-page">
      <div className="ai-container">
        {/* Header */}
        <div className="ai-header-card">
          <div className="ai-title-row">
            <div className="ai-icon-bubble">
              <Sparkles size={24} className="sparkle-active" />
            </div>
            <div>
              <div className="ai-badge">Handover &bull; AI Assistant</div>
              <h1>Handover Valuation &amp; Listing Copilot</h1>
              <p>
                Get AI-assisted starting price estimates, polished item descriptions, and Handover auction advice.
              </p>
            </div>
          </div>
        </div>

        {/* Input Box */}
        <div className="ai-input-card">
          <label htmlFor="ai-prompt" className="ai-input-label">
            Describe the item you want to auction or ask for campus pricing guidance:
          </label>
          <div className="ai-input-wrapper">
            <textarea
              id="ai-prompt"
              rows="3"
              className="ai-textarea"
              placeholder="e.g. I have a 24-inch Dell monitor and 1000W heater. What price should I start them at?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            ></textarea>
            <button
              className="btn-ai-generate"
              disabled={loading || !prompt.trim()}
              onClick={() => handleGenerate(prompt)}
            >
              {loading ? (
                'Analyzing...'
              ) : (
                <>
                  <Send size={16} /> Generate
                </>
              )}
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="sample-prompts-tray">
            <span className="tray-label">Try asking:</span>
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="sample-prompt-pill"
                onClick={() => {
                  setPrompt(p);
                  handleGenerate(p);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Output Box */}
        {response && (
          <div className="ai-result-card">
            <div className="result-header">
              <div className="title-with-icon">
                <Bot size={20} className="bot-icon" />
                <h3>AI Recommendation &amp; Listing Draft</h3>
              </div>
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check size={14} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy Description
                  </>
                )}
              </button>
            </div>

            <div className="pricing-suggestion-row">
              <div className="price-sug-card">
                <span className="sug-label">Suggested Starting Bid</span>
                <strong className="sug-val">{response.suggestedStartingPrice}</strong>
              </div>
              <div className="price-sug-card">
                <span className="sug-label">Min Increment</span>
                <strong className="sug-val">{response.suggestedIncrement}</strong>
              </div>
              <div className="price-sug-card highlight">
                <span className="sug-label">Estimated Campus Value</span>
                <strong className="sug-val-highlight">{response.estimatedFairValue}</strong>
              </div>
            </div>

            <div className="generated-desc-box">
              <span className="desc-box-label">Generated Marketplace Description:</span>
              <p className="desc-text">{response.generatedDescription}</p>
            </div>

            <div className="campus-tip-box">
              <Lightbulb size={18} className="bulb-icon" />
              <div>
                <strong>Campus Tip:</strong>
                <p>{response.campusTip}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
