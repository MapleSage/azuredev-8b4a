use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Consumer,
    Broker,
    Agent,
    Insurer,
    Regulator,
}

impl std::str::FromStr for UserRole {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "consumer"  => Ok(Self::Consumer),
            "broker"    => Ok(Self::Broker),
            "agent"     => Ok(Self::Agent),
            "insurer"   => Ok(Self::Insurer),
            "regulator" => Ok(Self::Regulator),
            _ => Err(()),
        }
    }
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Consumer  => "consumer",
            Self::Broker    => "broker",
            Self::Agent     => "agent",
            Self::Insurer   => "insurer",
            Self::Regulator => "regulator",
        };
        f.write_str(s)
    }
}

/// JWT payload — issued by the auth service, verified by the JWT middleware.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// Subject — the user's UUID.
    pub sub: Uuid,
    pub role: UserRole,
    /// Issued-at (Unix seconds).
    pub iat: i64,
    /// Expiry (Unix seconds).
    pub exp: i64,
}
