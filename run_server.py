#!/usr/bin/env python3
"""
PayrollHub - Local Demo Server
Servidor simple en Python para demostración
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import math

PORT = 3000
HOST = 'localhost'

def calculate_taxes(gross_pay, pay_frequency, filing_status, allowances=0):
    """Calcula impuestos federales"""
    period_multiplier = {'weekly': 52, 'biweekly': 26, 'semimonthly': 24, 'monthly': 12}.get(pay_frequency, 12)
    annual_gross = gross_pay * period_multiplier

    # Social Security
    ss_tax = gross_pay * 0.062

    # Medicare
    medicare_tax = gross_pay * 0.0145

    # Federal income tax
    standard_deduction = {
        'single': 14600,
        'married': 29200,
        'head_of_household': 21900
    }.get(filing_status, 14600)

    allowance_value = 5150
    taxable_annual = max(0, annual_gross - standard_deduction - (allowances * allowance_value))
    annual_fed_tax = taxable_annual * 0.12
    federal_tax = annual_fed_tax / period_multiplier

    return {
        'federalIncomeTax': round(max(0, federal_tax) * 100) / 100,
        'socialSecurityTax': round(ss_tax * 100) / 100,
        'medicareTax': round(medicare_tax * 100) / 100,
        'totalTax': round(max(0, federal_tax + ss_tax + medicare_tax) * 100) / 100
    }

class PayrollHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'404 Not Found')

    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/payroll/calculate':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
                taxes = calculate_taxes(
                    data.get('grossPay'),
                    data.get('payFrequency'),
                    data.get('filingStatus'),
                    data.get('allowances', 0)
                )

                response = {
                    'success': True,
                    'data': {
                        'grossPay': data.get('grossPay'),
                        'taxes': taxes,
                        'netPay': data.get('grossPay') - taxes['totalTax']
                    }
                }

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Suppress logging"""
        pass

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PayrollHub - SaaS de Nómina</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      width: 100%;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    header h1 {
      font-size: 36px;
      margin-bottom: 10px;
    }

    .content {
      padding: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }

    .section {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
    }

    .section h2 {
      color: #1a365d;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 15px;
    }

    label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
      font-size: 14px;
    }

    input, select {
      width: 100%;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    input:focus, select:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }

    button:hover {
      transform: translateY(-2px);
    }

    .result {
      background: #f0f9ff;
      border-left: 4px solid #2563eb;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
    }

    .result-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #dbeafe;
      font-size: 14px;
    }

    .result-value {
      font-weight: 600;
      color: #1a365d;
    }

    .status {
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
      color: #065f46;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 13px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 20px;
    }

    .stat-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-number {
      font-size: 24px;
      font-weight: bold;
    }

    .stat-label {
      font-size: 12px;
      opacity: 0.9;
    }

    @media (max-width: 768px) {
      .content {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 PayrollHub</h1>
      <p>SaaS de Nómina para Pequeños Negocios</p>
    </header>

    <div class="content">
      <div class="section">
        <h2>💰 Calculadora de Nómina</h2>
        <div class="status">✅ Sistema operativo - Prueba los cálculos de impuestos</div>

        <div class="form-group">
          <label>Salario Bruto</label>
          <input type="number" id="grossPay" value="2000" step="10" min="0">
        </div>

        <div class="form-group">
          <label>Frecuencia de Pago</label>
          <select id="payFrequency">
            <option value="biweekly" selected>Quincenal</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>

        <div class="form-group">
          <label>Estado Civil (Federal)</label>
          <select id="filingStatus">
            <option value="single" selected>Soltero/a</option>
            <option value="married">Casado/a</option>
            <option value="head_of_household">Jefe de Hogar</option>
          </select>
        </div>

        <button onclick="calculatePayroll()">Calcular Impuestos</button>
        <div id="results"></div>
      </div>

      <div class="section">
        <h2>📊 Información del Proyecto</h2>
        <div class="stats">
          <div class="stat-box">
            <div class="stat-number">25+</div>
            <div class="stat-label">Archivos</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">2.5K</div>
            <div class="stat-label">Líneas de Código</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">10+</div>
            <div class="stat-label">Guías</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">7</div>
            <div class="stat-label">Tablas BD</div>
          </div>
        </div>

        <h3 style="margin-top: 25px; color: #1a365d;">✨ Características</h3>
        <ul style="margin-left: 20px; margin-top: 15px; font-size: 14px; line-height: 1.8; color: #475569;">
          <li>✅ Gestión de empleados completa</li>
          <li>✅ Cálculo de nómina automático</li>
          <li>✅ Multi-tenant con RLS</li>
          <li>✅ API REST funcional</li>
          <li>✅ Base de datos PostgreSQL</li>
          <li>✅ Autenticación JWT</li>
        </ul>
      </div>
    </div>
  </div>

  <script>
    function calculatePayroll() {
      const grossPay = parseFloat(document.getElementById('grossPay').value);
      const payFrequency = document.getElementById('payFrequency').value;
      const filingStatus = document.getElementById('filingStatus').value;

      fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({grossPay, payFrequency, filingStatus, allowances: 0})
      })
      .then(r => r.json())
      .then(result => {
        const taxes = result.data.taxes;
        const netPay = result.data.netPay;

        document.getElementById('results').innerHTML = `
          <div class="result">
            <h3>📋 Resultado</h3>
            <div class="result-row">
              <span>Salario Bruto:</span>
              <span class="result-value">$${grossPay.toFixed(2)}</span>
            </div>
            <div class="result-row">
              <span>Impuesto Federal:</span>
              <span class="result-value">$${taxes.federalIncomeTax.toFixed(2)}</span>
            </div>
            <div class="result-row">
              <span>Social Security (6.2%):</span>
              <span class="result-value">$${taxes.socialSecurityTax.toFixed(2)}</span>
            </div>
            <div class="result-row">
              <span>Medicare (1.45%):</span>
              <span class="result-value">$${taxes.medicareTax.toFixed(2)}</span>
            </div>
            <div class="result-row" style="border-top: 2px solid #93c5fd; padding-top: 12px; margin-top: 12px;">
              <span><strong>Salario Neto:</strong></span>
              <span class="result-value"><strong style="color: #15803d;">$${netPay.toFixed(2)}</strong></span>
            </div>
          </div>
        `;
      });
    }

    window.onload = () => calculatePayroll();
  </script>
</body>
</html>'''

if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), PayrollHandler)
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║               🚀 PAYROLLHUB - SERVIDOR ACTIVO 🚀               ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📱 Abre tu navegador en:
   👉 http://{HOST}:{PORT}

✨ Este servidor permite:
   • Calcular impuestos federales en tiempo real
   • Ver la estructura del proyecto
   • Probar el motor de cálculos

📚 Documentación:
   • START.txt - Instrucciones rápidas
   • SETUP_SUPABASE.md - Configurar Supabase
   • DEVELOPMENT.md - Guía de desarrollo

🛑 Para detener: Presiona Ctrl+C

════════════════════════════════════════════════════════════════
""")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✅ Servidor detenido")
        server.server_close()
