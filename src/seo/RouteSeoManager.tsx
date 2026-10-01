import { useLocation } from 'react-router-dom';
import SeoHead from './SeoHead';
import { resolveRouteSeo } from './routeSeo';

export default function RouteSeoManager() {
  const { pathname, search } = useLocation();
  const metadata = resolveRouteSeo(pathname, search);

  return (
    <SeoHead
      title={metadata.title}
      description={metadata.description}
      path={pathname}
      image={metadata.image}
      robots={metadata.robots}
      jsonLd={metadata.jsonLd}
    />
  );
}
