use chrono::{DateTime, Local, NaiveDate, NaiveDateTime, NaiveTime, TimeZone, Utc};

/// Combines a list date (YYYY-MM-DD) and a task time (HH:MM or HH:MM:SS) into a UTC DateTime
/// based on the local machine's timezone.
pub fn parse_due_instant(date_str: &str, time_str: &str) -> Result<DateTime<Utc>, String> {
    let date = NaiveDate::parse_from_str(date_str.trim(), "%Y-%m-%d")
        .map_err(|e| format!("Invalid date '{}': {e}", date_str))?;

    let trimmed_time = time_str.trim();
    let time = if trimmed_time.is_empty() {
        // Default to 12:00 if no time is provided
        NaiveTime::from_hms_opt(12, 0, 0).unwrap()
    } else if let Ok(t) = NaiveTime::parse_from_str(trimmed_time, "%H:%M") {
        t
    } else if let Ok(t) = NaiveTime::parse_from_str(trimmed_time, "%H:%M:%S") {
        t
    } else {
        return Err(format!("Invalid time format '{}', expected HH:mm", time_str));
    };

    let naive_dt = NaiveDateTime::new(date, time);

    // Map naive local datetime into local timezone safely handling DST gaps/ambiguities
    let local_dt = match Local.from_local_datetime(&naive_dt) {
        chrono::LocalResult::Single(dt) => dt,
        chrono::LocalResult::Ambiguous(earliest, _) => earliest,
        chrono::LocalResult::None => {
            // In a DST gap (e.g. spring forward), advance 1 hour to resolve safely
            let adjusted = naive_dt + chrono::Duration::hours(1);
            match Local.from_local_datetime(&adjusted) {
                chrono::LocalResult::Single(dt) => dt,
                chrono::LocalResult::Ambiguous(earliest, _) => earliest,
                chrono::LocalResult::None => Local::now(),
            }
        }
    };

    Ok(local_dt.with_timezone(&Utc))
}

/// Checks whether a trigger instant is in the past compared to the reference time.
pub fn is_overdue(trigger_at: &DateTime<Utc>, now: &DateTime<Utc>) -> bool {
    trigger_at <= now
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_valid_date_and_time() {
        let res = parse_due_instant("2026-09-01", "14:30");
        assert!(res.is_ok());
        let dt = res.unwrap();
        assert!(dt.timestamp() > 0);
    }

    #[test]
    fn parses_date_with_empty_time_defaulting_to_noon() {
        let res = parse_due_instant("2026-09-01", "");
        assert!(res.is_ok());
    }

    #[test]
    fn returns_error_on_invalid_date() {
        let res = parse_due_instant("invalid-date", "14:30");
        assert!(res.is_err());
    }

    #[test]
    fn returns_error_on_invalid_time() {
        let res = parse_due_instant("2026-09-01", "25:99");
        assert!(res.is_err());
    }

    #[test]
    fn evaluates_overdue_correctly() {
        let now = Utc::now();
        let past = now - chrono::Duration::minutes(5);
        let future = now + chrono::Duration::minutes(5);

        assert!(is_overdue(&past, &now));
        assert!(!is_overdue(&future, &now));
    }
}
