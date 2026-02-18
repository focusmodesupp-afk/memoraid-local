# פקודה אחת ליצירת כל מבנה התיקיות (פרק 3)

## אם יש לך Git Bash / WSL / Linux / macOS (פורמט mkdir -p):

```bash
mkdir -p client/src client/public server/src server/db shared/src
```

## אם אתה ב-PowerShell (Windows):

```powershell
New-Item -ItemType Directory -Force -Path "client/src","client/public","server/src","server/db","shared/src"
```

## מבנה שנוצר:
```
memoraid-local/
├── client/
│   ├── src/
│   └── public/
├── server/
│   ├── src/
│   └── db/
└── shared/
    └── src/
```
