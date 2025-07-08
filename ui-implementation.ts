// Add these imports to your existing imports
import {
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Badge,
} from '@chakra-ui/react';
import { format } from 'date-fns';

// Inside your WorkspaceAnalytics component, add these state variables
const [activityDays, setActivityDays] = useState<number>(45);
const [newlyCreatedHours, setNewlyCreatedHours] = useState<number>(24);

// Add these queries after your existing queries
// Get total workspace count
const {
  data: workspaceCount,
  isLoading: isLoadingCount,
} = api.workspace.getWorkspaceCount.useQuery(
  { eonid: selectedEonId ?? undefined },
  {
    enabled: isReady,
    refetchOnWindowFocus: false,
  }
);

// Get newly created workspaces count
const {
  data: newlyCreatedCount,
  isLoading: isLoadingNewlyCreated,
} = api.workspace.getNewlyCreatedCount.useQuery(
  { 
    hours: newlyCreatedHours,
    eonid: selectedEonId ?? undefined,
  },
  {
    enabled: isReady,
    refetchOnWindowFocus: false,
  }
);

// Get active workspaces count
const {
  data: activeCount,
  isLoading: isLoadingActive,
} = api.workspace.getActiveCount.useQuery(
  { 
    days: activityDays,
    eonid: selectedEonId ?? undefined,
  },
  {
    enabled: isReady,
    refetchOnWindowFocus: false,
  }
);

// Get recently created workspaces
const {
  data: recentWorkspaces,
  isLoading: isLoadingRecent,
} = api.workspace.getRecentlyCreated.useQuery(
  { 
    limit: 5,
    eonid: selectedEonId ?? undefined,
  },
  {
    enabled: isReady,
    refetchOnWindowFocus: false,
  }
);

// Helper function to convert ObjectId to Date
const objectIdToDate = (id: string) => {
  const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
  return new Date(timestamp);
};

// Add this JSX before your graph component
// Stats Cards
<StatGroup mb="6" gap="4" flexWrap="wrap">
  <Stat
    p="4"
    bg="white"
    borderRadius="md"
    boxShadow="sm"
    minW={{ base: '100%', md: '200px' }}
    flex="1"
  >
    <StatLabel>Total Workspaces</StatLabel>
    <StatNumber>
      {isLoadingCount ? <Spinner size="sm" /> : workspaceCount?.toLocaleString() || 0}
    </StatNumber>
  </Stat>
  
  <Stat
    p="4"
    bg="white"
    borderRadius="md"
    boxShadow="sm"
    minW={{ base: '100%', md: '200px' }}
    flex="1"
  >
    <StatLabel display="flex" alignItems="center">
      Newly Created
      <Box ml="2">
        <NumberInput
          size="xs"
          min={1}
          max={72}
          value={newlyCreatedHours}
          onChange={(_, value) => setNewlyCreatedHours(value)}
          width="80px"
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </Box>
      <Text fontSize="xs" ml="1">hrs</Text>
    </StatLabel>
    <StatNumber>
      {isLoadingNewlyCreated ? <Spinner size="sm" /> : newlyCreatedCount?.toLocaleString() || 0}
    </StatNumber>
  </Stat>
  
  <Stat
    p="4"
    bg="white"
    borderRadius="md"
    boxShadow="sm"
    minW={{ base: '100%', md: '200px' }}
    flex="1"
  >
    <StatLabel display="flex" alignItems="center">
      Active Workspaces
      <Box ml="2">
        <Select
          size="xs"
          value={activityDays}
          onChange={(e) => setActivityDays(Number(e.target.value))}
          width="80px"
        >
          <option value="40">40</option>
          <option value="45">45</option>
          <option value="60">60</option>
          <option value="90">90</option>
          <option value="120">120</option>
        </Select>
      </Box>
      <Text fontSize="xs" ml="1">days</Text>
    </StatLabel>
    <StatNumber>
      {isLoadingActive ? <Spinner size="sm" /> : activeCount?.toLocaleString() || 0}
    </StatNumber>
  </Stat>
</StatGroup>

{/* Recently Created Workspaces Table */}
<Box bg="white" p="4" borderRadius="md" boxShadow="sm" mb="6">
  <Heading size="sm" mb="4">Recently Created Workspaces</Heading>
  {isLoadingRecent ? (
    <Center py="4">
      <Spinner />
    </Center>
  ) : !recentWorkspaces?.length ? (
    <Center py="4">
      <Text>No recent workspaces</Text>
    </Center>
  ) : (
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th>Instance</Th>
          <Th>Workspace ID</Th>
          <Th>EON ID</Th>
          <Th>Created Date</Th>
        </Tr>
      </Thead>
      <Tbody>
        {recentWorkspaces.map((workspace) => (
          <Tr key={workspace._id.toString()}>
            <Td>{workspace.instance}</Td>
            <Td>{workspace.workspaceId}</Td>
            <Td>
              <Badge colorScheme="blue">{workspace.eonid}</Badge>
            </Td>
            <Td>{format(objectIdToDate(workspace._id.toString()), 'MMM dd, yyyy HH:mm')}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )}
</Box>
