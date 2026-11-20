# Setup

Everything you need to run this on a new machine. The app stack is chosen in Phase 3;
install and run steps are added then.

## 1. Clone

```bash
git clone https://github.com/samanvaya/Kidly-Stroriez.git
cd Kidly-Stroriez
```

## 2. Secrets

Copy the example file. Never commit the real one, it is git-ignored for a reason.

```bash
cp .env.example .env
```

No keys are needed yet. Each key gets an entry here when it is introduced: what it is,
where to get it, what it costs, and whether it can be regenerated.

## 3. Check

```bash
./scripts/verify.sh
```

## Moving between machines
Never email, message, or paste secrets into a chat window. Get fresh values from the
sources above on each machine. If a key has ever appeared in a chat transcript or a
screenshot, rotate it.
