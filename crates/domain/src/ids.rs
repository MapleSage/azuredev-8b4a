use serde::{Deserialize, Serialize};
use uuid::Uuid;

macro_rules! newtype_id {
    ($name:ident) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
        #[serde(transparent)]
        pub struct $name(pub Uuid);

        impl $name {
            pub fn new() -> Self {
                Self(Uuid::new_v4())
            }
        }

        impl Default for $name {
            fn default() -> Self {
                Self::new()
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                self.0.fmt(f)
            }
        }

        impl std::str::FromStr for $name {
            type Err = uuid::Error;
            fn from_str(s: &str) -> Result<Self, Self::Err> {
                Ok(Self(s.parse()?))
            }
        }
    };
}

newtype_id!(UserId);
newtype_id!(PolicyId);
newtype_id!(ClaimId);
newtype_id!(SchemaId);

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RiskScore(pub u8);

impl RiskScore {
    pub fn new(v: u8) -> Self {
        Self(v.min(100))
    }
    pub fn value(self) -> u8 {
        self.0
    }
}
