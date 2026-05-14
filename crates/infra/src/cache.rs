use redis::{aio::ConnectionManager, Client};

#[derive(Clone)]
pub struct CacheClient(ConnectionManager);

impl CacheClient {
    pub async fn connect(url: &str) -> Result<Self, redis::RedisError> {
        let client = Client::open(url)?;
        let mgr = ConnectionManager::new(client).await?;
        Ok(Self(mgr))
    }
}

impl std::ops::Deref for CacheClient {
    type Target = ConnectionManager;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl std::ops::DerefMut for CacheClient {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}
