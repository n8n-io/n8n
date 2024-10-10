CREATE TABLE IF NOT EXISTS special_dates
(
   ts timestamp with time zone DEFAULT now()
);

INSERT INTO special_dates (ts)
VALUES
    ('infinity'::timestamptz),
    ('-infinity'::timestamptz),
    ('epoch'::timestamptz),
    ('now'::timestamptz),
    ('today'::timestamptz),
    ('tomorrow'::timestamptz),
    ('yesterday'::timestamptz);


CREATE TABLE IF NOT EXISTS test_allballs
(
   t time
);

INSERT INTO test_allballs (t)
VALUES
    ('allballs');
