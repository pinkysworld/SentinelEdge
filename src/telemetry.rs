use std::error::Error;
use std::fmt;
use std::fs;
use std::path::Path;

pub const CSV_HEADER: &str = "timestamp_ms,cpu_load_pct,memory_load_pct,temperature_c,network_kbps,auth_failures,battery_pct,integrity_drift";

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TelemetrySample {
    pub timestamp_ms: u64,
    pub cpu_load_pct: f32,
    pub memory_load_pct: f32,
    pub temperature_c: f32,
    pub network_kbps: f32,
    pub auth_failures: u32,
    pub battery_pct: f32,
    pub integrity_drift: f32,
}

#[derive(Debug, Clone)]
pub struct ParseTelemetryError {
    message: String,
}

impl ParseTelemetryError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl fmt::Display for ParseTelemetryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl Error for ParseTelemetryError {}

impl TelemetrySample {
    pub fn parse_csv(path: &Path) -> Result<Vec<Self>, ParseTelemetryError> {
        let raw = fs::read_to_string(path).map_err(|error| {
            ParseTelemetryError::new(format!("failed to read {}: {error}", path.display()))
        })?;

        let mut lines = raw.lines().filter(|line| !line.trim().is_empty());
        let header = lines
            .next()
            .ok_or_else(|| ParseTelemetryError::new("telemetry file is empty"))?;

        if header.trim() != CSV_HEADER {
            return Err(ParseTelemetryError::new(format!(
                "unexpected CSV header. expected `{CSV_HEADER}`"
            )));
        }

        let mut samples = Vec::new();
        for (line_offset, line) in lines.enumerate() {
            samples.push(Self::parse_line(line, line_offset + 2)?);
        }

        if samples.is_empty() {
            return Err(ParseTelemetryError::new(
                "telemetry file contained a header but no samples",
            ));
        }

        Ok(samples)
    }

    pub fn parse_line(line: &str, line_number: usize) -> Result<Self, ParseTelemetryError> {
        let parts: Vec<_> = line.split(',').map(str::trim).collect();
        if parts.len() != 8 {
            return Err(ParseTelemetryError::new(format!(
                "line {line_number}: expected 8 columns, found {}",
                parts.len()
            )));
        }

        let sample = Self {
            timestamp_ms: parse(parts[0], line_number, "timestamp_ms")?,
            cpu_load_pct: parse(parts[1], line_number, "cpu_load_pct")?,
            memory_load_pct: parse(parts[2], line_number, "memory_load_pct")?,
            temperature_c: parse(parts[3], line_number, "temperature_c")?,
            network_kbps: parse(parts[4], line_number, "network_kbps")?,
            auth_failures: parse(parts[5], line_number, "auth_failures")?,
            battery_pct: parse(parts[6], line_number, "battery_pct")?,
            integrity_drift: parse(parts[7], line_number, "integrity_drift")?,
        };

        sample.validate(line_number)?;
        Ok(sample)
    }

    fn validate(&self, line_number: usize) -> Result<(), ParseTelemetryError> {
        validate_range(self.cpu_load_pct, 0.0, 100.0, line_number, "cpu_load_pct")?;
        validate_range(
            self.memory_load_pct,
            0.0,
            100.0,
            line_number,
            "memory_load_pct",
        )?;
        validate_range(self.battery_pct, 0.0, 100.0, line_number, "battery_pct")?;
        validate_range(
            self.integrity_drift,
            0.0,
            1.0,
            line_number,
            "integrity_drift",
        )?;

        if self.network_kbps < 0.0 {
            return Err(ParseTelemetryError::new(format!(
                "line {line_number}: network_kbps must be non-negative"
            )));
        }

        Ok(())
    }
}

fn parse<T>(raw: &str, line_number: usize, field: &str) -> Result<T, ParseTelemetryError>
where
    T: std::str::FromStr,
    T::Err: fmt::Display,
{
    raw.parse::<T>().map_err(|error| {
        ParseTelemetryError::new(format!(
            "line {line_number}: invalid {field} value `{raw}`: {error}"
        ))
    })
}

fn validate_range(
    value: f32,
    min: f32,
    max: f32,
    line_number: usize,
    field: &str,
) -> Result<(), ParseTelemetryError> {
    if !(min..=max).contains(&value) {
        return Err(ParseTelemetryError::new(format!(
            "line {line_number}: {field} must be in range {min}..={max}"
        )));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::TelemetrySample;

    #[test]
    fn parses_line() {
        let sample = TelemetrySample::parse_line("42,10,20,35,1200,2,80,0.15", 3).unwrap();

        assert_eq!(sample.timestamp_ms, 42);
        assert_eq!(sample.auth_failures, 2);
        assert_eq!(sample.integrity_drift, 0.15);
    }

    #[test]
    fn rejects_bad_range() {
        let error = TelemetrySample::parse_line("42,101,20,35,1200,2,80,0.15", 3).unwrap_err();
        assert!(error.to_string().contains("cpu_load_pct"));
    }
}
