CREATE TABLE public.parent_coach_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  consent_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.parent_coach_participants TO service_role;
ALTER TABLE public.parent_coach_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.parent_coach_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  opening text NOT NULL DEFAULT '',
  guidance text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.parent_coach_scenarios TO service_role;
ALTER TABLE public.parent_coach_scenarios ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.parent_coach_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.parent_coach_participants(id) ON DELETE CASCADE,
  mode text NOT NULL,
  scenario_id uuid,
  title text NOT NULL DEFAULT '',
  feedback text,
  safety_flag boolean NOT NULL DEFAULT false,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.parent_coach_conversations TO service_role;
ALTER TABLE public.parent_coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.parent_coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.parent_coach_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.parent_coach_messages TO service_role;
ALTER TABLE public.parent_coach_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.parent_coach_messages(conversation_id, created_at);
CREATE INDEX ON public.parent_coach_conversations(participant_id, created_at);

INSERT INTO public.parent_coach_scenarios (title, opening, sort_order) VALUES
('הבן לא עונה', '(הבן קרא את ההודעה שלך ולא עונה כבר כמה שעות)', 1),
('״אתה לא מבין אותי״', 'אתה פשוט לא מבין אותי. אין טעם לדבר איתך.', 2),
('הבן מבקש להיות לבד', 'אני לא רוצה לדבר עכשיו. תעזוב אותי.', 3),
('התעניינות שהופכת לחקירה', 'למה אתה כל הזמן שואל איפה הייתי ועם מי? זה חקירה?', 4),
('הצבת גבול', 'אבל כולם נשארים בחוץ עד מאוחר. למה רק אני לא?', 5),
('האב נפגע מדברי הבן', 'בכלל לא אכפת לי מה אתה חושב.', 6),
('חידוש קשר אחרי ריב', '(עברו יומיים מאז הריב. הבן נכנס למטבח ולא מסתכל עליך)', 7);