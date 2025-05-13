import React, { useState } from 'react';
import axios from 'axios';
import { Container, Form, Button, Alert, Spinner, Row, Col, Card, Modal } from 'react-bootstrap';
import { handleApiError } from './error-handling/apiErrorHandler';
import { validateTestRequest } from './error-handling/validation';
import './App.css';

// Set axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [url, setUrl] = useState('');
  const [device, setDevice] = useState('Tecno Spark 10 Pro');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  const devices = [
    'Tecno Spark 10 Pro',
    'Samsung Galaxy S20',
    'iPhone X',
    'iPhone 11 Pro',
    'iPad Pro 11'
  ];

  const runMobileTest = async (url, device) => {
    try {
      const response = await axios.post('/api/test', { url, deviceName: device });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: handleApiError(error) 
      };
    }
  };

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    const validationErrors = validateTestRequest(url, device);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      setLoading(false);
      return;
    }
    
    const { success, data, error } = await runMobileTest(url, device);
    
    if (success) {
      setResult({
        ...data,
        screenshots: data.screenshots.map(s => 
          s.startsWith('http') ? s : `${axios.defaults.baseURL}${s}`
        )
      });
    } else {
      setError(error);
    }
    
    setLoading(false);
  };

  const openImageModal = (imgUrl) => {
    setSelectedImage(imgUrl);
    setShowModal(true);
  };

  return (
    <div className="app-container">
      <Container className="py-5">
        <Card className="shadow-lg">
          <Card.Header className="bg-primary text-white">
            <h1 className="text-center mb-0">Mobile Responsiveness Tester</h1>
          </Card.Header>
          <Card.Body>
            <Form>
              <Row className="mb-4">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Website URL</Form.Label>
                    <Form.Control
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="form-control-lg"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Device</Form.Label>
                    <Form.Select 
                      value={device}
                      onChange={(e) => setDevice(e.target.value)}
                      className="form-control-lg"
                    >
                      {devices.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <div className="text-center">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={runTest}
                  disabled={loading || !url}
                  className="px-5"
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" /> Testing...
                    </>
                  ) : 'Run Test'}
                </Button>
              </div>
            </Form>

            {error && (
              <Alert variant="danger" className="mt-4" onClose={() => setError(null)} dismissible>
                <Alert.Heading>Error</Alert.Heading>
                <p>{error}</p>
              </Alert>
            )}

            {result && (
              <div className="mt-5">
                <Card className="border-success">
                  <Card.Header className="bg-success text-white">
                    <h4 className="mb-0">Test Results</h4>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6} className="mb-4">
                        <Card>
                          <Card.Header className="bg-info text-white">
                            <h5>Report Summary</h5>
                          </Card.Header>
                          <Card.Body>
                            {result.problems && result.problems.length === 0 ? (
                              <Alert variant="success">
                                No mobile issues detected!
                              </Alert>
                            ) : (
                              <div>
                                <h6>Found Issues:</h6>
                                <ul>
                                  {result.problems?.map((problem, index) => (
                                    <li key={index}>{problem}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="text-center mt-3">
                              <Button 
                                variant="primary" 
                                href={`/api/report/${result.testId}`} 
                                target="_blank"
                              >
                                Download Full Report (PDF)
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card>
                          <Card.Header className="bg-info text-white">
                            <h5>Screenshots</h5>
                          </Card.Header>
                          <Card.Body>
                            <div className="screenshot-grid">
                              {result.screenshots?.map((screenshot, index) => (
                                <div key={index} className="screenshot-item">
                                  <Card 
                                    className="h-100 cursor-pointer"
                                    onClick={() => openImageModal(screenshot)}
                                  >
                                    <Card.Img 
                                      variant="top" 
                                      src={screenshot} 
                                      alt={`Screenshot ${index + 1}`}
                                    />
                                    <Card.Body className="p-2 text-center">
                                      <small>Screenshot {index + 1}</small>
                                    </Card.Body>
                                  </Card>
                                </div>
                              ))}
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </div>
            )}
          </Card.Body>
          <Card.Footer className="text-muted text-center">
            Mobile Responsiveness Tester © {new Date().getFullYear()}
          </Card.Footer>
        </Card>
      </Container>

      {/* Image Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Screenshot Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <img 
            src={selectedImage} 
            alt="Full screenshot" 
            className="img-fluid"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            href={selectedImage} 
            target="_blank"
            download
          >
            Download
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;