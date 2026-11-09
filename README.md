# Formulaire Chal Five (Next.js)

## Lancer
    npm install
    npm run dev        # http://localhost:3000

## Recevoir les réponses par e-mail (chalfive237@gmail.com)
1. Copier `.env.example` en `.env.local`
2. Créer un « mot de passe d'application » Google (validation en 2 étapes requise) :
   https://myaccount.google.com/apppasswords
3. Renseigner `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`.

Sans ces variables, en local les réponses s'affichent seulement dans le terminal.
En production (Vercel : Settings → Environment Variables), elles sont obligatoires.

## Modifier les questions
Tout est dans `lib/questions.js`. Après l'envoi : redirection vers https://www.chalfive.com
