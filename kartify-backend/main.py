"""
Kartify Backend — Main Application Entry Point

A universal price comparison and cart aggregation API
for India's quick commerce platforms.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from routers import auth, search, cart, history, deals, alerts

# Load settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="Kartify API",
    description="Universal cart & price comparison for India's quick commerce ecosystem.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(search.router)
app.include_router(cart.router)
app.include_router(history.router)
app.include_router(deals.router)
app.include_router(alerts.router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "kartify-backend",
        "version": "0.1.0",
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — welcome message."""
    return {
        "message": "Welcome to Kartify API",
        "docs": "/docs",
        "health": "/health",
    }
