select id, email, email_confirmed_at, banned_until, is_sso_user, last_sign_in_at
from auth.users
where lower(email) = lower('kajalkhanna.khanna210@gmail.com');
