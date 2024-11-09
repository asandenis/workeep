import os
import subprocess
import signal
import sys

def start_servers():
    try:
        subprocess.Popen(['node', 'server.js'])
        subprocess.Popen(['node', 'serverFiles.js'])
        subprocess.Popen(['python', 'server.py'])
        print("Servers started.")
    except FileNotFoundError as e:
        print(f"Error: {e}")

def stop_servers():
    ports = [3001, 3002, 5000]
    for port in ports:
        if os.name == 'nt':
            find_cmd = f"netstat -ano | findstr :{port}"
            kill_cmd_prefix = "taskkill /F /PID "
        else:
            find_cmd = f"lsof -i :{port} | grep LISTEN"
            kill_cmd_prefix = "kill -9 "

        try:
            output = subprocess.check_output(find_cmd, shell=True).decode()
            if os.name == 'nt':
                for line in output.strip().split('\n'):
                    parts = line.split()
                    pid = parts[-1]
                    kill_cmd = kill_cmd_prefix + pid
                    subprocess.call(kill_cmd, shell=True)
            else:
                for line in output.strip().split('\n'):
                    pid = line.split()[1]
                    kill_cmd = kill_cmd_prefix + pid
                    subprocess.call(kill_cmd, shell=True)
        except subprocess.CalledProcessError:
            print(f"No process found running on port {port}")

    print("Servers stopped.")

def main():
    while True:
        command = input("Enter a command ('start'/'stop'/'exit'): ").strip().lower()

        if command in ['start', '1']:
            start_servers()
        elif command in ['stop', '0']:
            stop_servers()
        elif command in ['exit', 'quit', 'q']:
            stop_servers()
            print("Exiting the script.")
            break
        else:
            print("Unknown command.")

if __name__ == "__main__":
    main()