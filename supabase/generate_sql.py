import json
import uuid

with open('actions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sql = "-- Seed Script gerado a partir da Planilha de Ações 2026\n"
sql += "-- Este script irá apagar TODAS as pautas e agendas atuais!\n\n"

sql += "TRUNCATE public.tasks CASCADE;\n"
sql += "TRUNCATE public.events CASCADE;\n\n"

sql += "INSERT INTO public.tasks (id, title, description, status, type, priority, creator)\nVALUES\n"

values = []
for item in data:
    acao = item.get("AÇÃO", "").replace("'", "''")
    sec = item.get("SECRETARIA", "").replace("'", "''")
    mes = item.get("MÊS", "").replace("'", "''")
    data_val = item.get("DATA", "").replace("'", "''")
    contrib = item.get("SECRETARIAS QUE PODEM CONTRIBUIR", "").replace("'", "''")
    obs = item.get("OBSERVAÇÕES", "").replace("'", "''")
    
    if not acao:
        continue
        
    desc = f"MÊS PREVISTO: {mes} | DATA: {data_val}"
    if contrib:
        desc += f"\\nCONTRIBUIÇÕES: {contrib}"
    if obs:
        desc += f"\\nOBSERVAÇÕES: {obs}"
        
    # Generate a predictable or random UUID
    task_id = str(uuid.uuid4())
    
    # We assign default 'release' type
    val = f"('{task_id}', '{acao}', '{desc}', 'solicitado', '{{release}}', 'media', '{sec}')"
    values.append(val)

sql += ",\n".join(values) + ";\n"

with open('seed_actions_2026.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print("SQL seed script generated successfully at seed_actions_2026.sql")
