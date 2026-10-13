import type { LocationData } from '../types/weather';

export const POPULAR_CITIES: LocationData[] = [
  { name: 'São Paulo', admin1: 'São Paulo', country: 'Brasil', lat: -23.5505, lon: -46.6333 },
  { name: 'Rio de Janeiro', admin1: 'Rio de Janeiro', country: 'Brasil', lat: -22.9068, lon: -43.1729 },
  { name: 'Brasília', admin1: 'Distrito Federal', country: 'Brasil', lat: -15.7975, lon: -47.8919 },
  { name: 'Curitiba', admin1: 'Paraná', country: 'Brasil', lat: -25.4284, lon: -49.2733 },
  { name: 'Belo Horizonte', admin1: 'Minas Gerais', country: 'Brasil', lat: -19.9208, lon: -43.9378 },
  { name: 'Salvador', admin1: 'Bahia', country: 'Brasil', lat: -12.9714, lon: -38.5014 },
  { name: 'Porto Alegre', admin1: 'Rio Grande do Sul', country: 'Brasil', lat: -30.0346, lon: -51.2177 },
  { name: 'Lisboa', admin1: 'Lisboa', country: 'Portugal', lat: 38.7223, lon: -9.1393 },
  { name: 'Tóquio', admin1: 'Tóquio', country: 'Japão', lat: 35.6762, lon: 139.6503 },
  { name: 'Nova York', admin1: 'Nova York', country: 'Estados Unidos', lat: 40.7128, lon: -74.0060 }
];

export async function searchCities(query: string): Promise<LocationData[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query.trim()
    )}&count=8&language=pt&format=json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha na busca de cidades');

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any) => ({
      name: item.name,
      admin1: item.admin1 || '',
      country: item.country || '',
      lat: item.latitude,
      lon: item.longitude,
    }));
  } catch (error) {
    console.error('Erro no geocoding:', error);
    // Fallback: filter popular cities
    return POPULAR_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.admin1?.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<LocationData> {
  try {
    // We can use bigdatacloud free client reverse geocoding or open-meteo closest search
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return {
        name: data.city || data.locality || data.principalSubdivision || 'Sua Localização',
        admin1: data.principalSubdivision || '',
        country: data.countryName || 'Brasil',
        lat,
        lon,
      };
    }
  } catch (e) {
    console.warn('Reverse geocode error, using default coordinates name', e);
  }

  return {
    name: 'Localização Atual',
    admin1: '',
    country: '',
    lat,
    lon,
  };
}
