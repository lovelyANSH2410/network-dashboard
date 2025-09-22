import { useState, useEffect } from 'react';

interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export const useCountries = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag');
        const data = await response.json();
        
        const formattedCountries: Country[] = data
          .map((country: any) => ({
            name: country.name.common,
            code: country.cca2,
            dialCode: country.idd?.root ? 
              `${country.idd.root}${country.idd.suffixes?.[0] || ''}` : 
              '',
            flag: country.flag
          }))
          .filter((country: Country) => country.dialCode)
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

        setCountries(formattedCountries);
      } catch (err) {
        setError('Failed to fetch countries');
        console.error('Error fetching countries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  return { countries, loading, error };
};