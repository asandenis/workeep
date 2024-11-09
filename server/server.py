from flask import Flask, request, redirect, url_for
from generators.passwordGen import generate_password
from generators.resetTokenGen import generate_reset_token

app = Flask(__name__)
app.secret_key = 'mysecretkey'

@app.route('/input', methods=['POST'])
def process_input():
    input_data = request.json
    input_text = input_data['inputText']
    global length
    length = int(input_text)
    return redirect(url_for('generator'))

@app.route('/generator')
def generator():
    global length
    generatedPassword = generate_password(length)
    return generatedPassword

@app.route('/generate-reset-token')
def get_reset_token():
    reset_token = generate_reset_token()
    return str(reset_token)

if __name__ == '__main__':
    app.run(debug=True)