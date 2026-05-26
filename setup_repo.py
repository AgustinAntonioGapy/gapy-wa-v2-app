import os
import sys
import subprocess
import requests

# Configuración
GITHUB_API_URL = "https://api.github.com/user/repos"

def get_input(prompt):
    return input(prompt).strip()

def run_command(command, cwd=None):
    """Ejecuta comandos de shell y maneja errores básicos."""
    try:
        # Ejecutamos el comando y capturamos la salida
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            cwd=cwd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Error ejecutando: {command}")
        print(f"Detalle: {e.stderr}")
        # No salimos del script inmediatamente para permitir debugging si es necesario
        sys.exit(1)

def create_github_repo(token, repo_name, description, is_private):
    """Crea el repositorio remoto usando la API de GitHub."""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    data = {
        "name": repo_name,
        "description": description,
        "private": is_private,
        "auto_init": False 
    }
    
    print(f"\nConectando con GitHub para crear '{repo_name}'...")
    response = requests.post(GITHUB_API_URL, json=data, headers=headers)
    
    if response.status_code == 201:
        print("✅ Repositorio creado exitosamente en GitHub.")
        json_data = response.json()
        clone_url = json_data['clone_url']
        
        # --- CORRECCIÓN CLAVE ---
        # Insertamos el token en la URL para que git push no pida contraseña
        # Formato: https://TOKEN@github.com/usuario/repo.git
        auth_url = clone_url.replace("https://", f"https://{token}@")
        return auth_url
        
    elif response.status_code == 422:
        print("❌ Error: El repositorio ya existe en tu cuenta.")
        sys.exit(1)
    else:
        print(f"❌ Error creando repositorio: {response.status_code}")
        print(response.json())
        sys.exit(1)

def main():
    print("--- Generador de Repositorio GitHub Automático v2 ---\n")
    
    # 1. Obtener datos
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        # Intenta leer token de archivo si existe para no pegarlo siempre (opcional)
        token = get_input("Pegue su GitHub Personal Access Token: ")
    
    current_folder_name = os.path.basename(os.getcwd())
    repo_name = get_input(f"Nombre del repositorio [{current_folder_name}]: ") or current_folder_name
    description = get_input("Descripción del proyecto: ")
    private_input = get_input("¿Es privado? (s/n) [s]: ").lower()
    is_private = True if private_input in ['', 's', 'si', 'y', 'yes'] else False

    # 2. Crear repositorio remoto y obtener URL autenticada
    auth_remote_url = create_github_repo(token, repo_name, description, is_private)
    
    # 3. Configurar Git local
    print("\nConfigurando Git local...")
    
    if not os.path.exists(".git"):
        run_command("git init")
    
    if not os.path.exists(".gitignore"):
        with open(".gitignore", "w") as f:
            f.write("__pycache__/\n*.pyc\n.env\nvenv/\n.vscode/\n")

    run_command("git branch -M main")
    run_command("git add .")
    
    # Verificar si hay cambios para commitear
    status = run_command("git status --porcelain")
    if status:
        run_command('git commit -m "Initial commit via auto-setup script"')
    
    # Configurar el remoto con la URL que incluye el token
    # Primero removemos origin si existe para evitar errores de duplicado
    subprocess.run("git remote remove origin", shell=True, stderr=subprocess.DEVNULL)
    run_command(f"git remote add origin {auth_remote_url}")

    # 4. Push final
    print("🚀 Subiendo archivos a GitHub...")
    run_command("git push -u origin main")
    
    # Limpiamos la URL visualmente para que el usuario no vea el token en el mensaje final
    clean_url = auth_remote_url.replace(f"{token}@", "")
    print(f"\n🎉 ¡Éxito Total! Proyecto subido a: {clean_url}")

if __name__ == "__main__":
    main()